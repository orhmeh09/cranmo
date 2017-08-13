'use strict';

const cranmoOptions = {
  maxRequests: 10,
  showDate: true,
  showDownloadCounts: true,
  urlForCRAN: 'https://cran.r-project.org/web/packages/',
  urlForDownloadCounts: 'https://cranlogs.r-pkg.org/downloads/total/2000-01-01:2100-01-01/'
};

let popup = null;
let popupLinkID = null;
let popupLink = null;
const requests = {};
const titleCache = {};


function prettyCount(x) {
  let ds = '';
  if (x >= 1000000) {
    ds = `${Math.round(x / 100000) / 10}M`;
  } else if (ds >= 10000) {
    ds = `${Math.round(x / 1000)}K`;
  } else {
    ds = `${x}`;
  }
  return ds;
}

function getPackageName(url) {
  const p = /^(?:https?:\/\/)?(?:cran\.)(.+)\/(?:web\/packages\/)([\w.-]+)/;
  return (url.match(p)) ? RegExp.$2 : false;
}


function createPopup() {
  const p = $('<div>');
  p.attr('style',
    'position: absolute;' +
    'pointer-events: none;' +
    'z-index: 19999999999;' +
    'color: black;' +
    'text-decoration: none !important;' +
    'font-size: 16px;' +
    'padding: 2px 4px;' +
    'background-color: #f4f1c2;' +
    'border: 1px dotted #aaa;'
  );
  return p;
}

function updateTitle() {
  if (!popup) return;
  const title = titleCache[popupLinkID];
  if (title) {
    popup.text(title);
  } else if (requests[popupLinkID]) {
    popup.text('[Fetching...]');
  } else {
    popup.text('[Waiting...]');
  }
}

function cranmoHoverOut() {
  if (popup) {
    popup.remove();
    popup = null;
    popupLinkID = null;
    popupLink = null;
  }
}

function cranmoHoverIn() {
  // check it's a CRAN link
  const id = getPackageName(this.href);
  if (!id) return;

  // create and add popup to document
  if (!popup) popup = createPopup();

  $(document.body).parent().append(popup);
  // const rect = popup.getBoundingClientRect();
  // popup.style.cssText = `top: ${(rect.top + document.body.scrollTop) - 24}; left: ${rect.left + document.body.scrollLeft}`;
  const pos = $(this).offset();
  popup.css({
    top: pos.top - 24,
    left: pos.left,
  });

  popupLinkID = id;
  popupLink = this;

  // fetch if haven't already but don't make too many requests to CRAN
  if (!titleCache[id]) {
    // get the title from CRAN
    const url = `${cranmoOptions.urlForCRAN}${id}/index.html`;

    fetch(url)
      .then((response) => {
        if (response.status !== 200) {
          console.log('Error fetching "%s". Response status: "%s"', url, response.status);
          return;
        }

        // Examine the text in the response
        response.text().then((txt) => {
          // console.log(txt);
          const data = new DOMParser().parseFromString(txt, 'text/html');
          let title = data.querySelector('h2').innerText;
          console.log(title);
          // let pubdate = this.response.body.querySelector($('td:contains('Published')').next('td')[0].innerText;

          const pubnode = Array.prototype.find.call(data.querySelectorAll('td'),
            element => (element.textContent === 'Published:' || element.textContent === 'Published'));

          let pubdate = '';
          if (pubnode) {
            const nn = pubnode.nextElementSibling;
            if (nn) pubdate = nn.innerText;
          }
          if (cranmoOptions.showDate) title = `${title} [${pubdate}]`;

          if (cranmoOptions.showDownloadCounts) {
            const downloadCountURL = `${cranmoOptions.urlForDownloadCounts}${id}`;
            fetch(downloadCountURL)
              .then(
                (downloadCountResponse) => {
                  if (downloadCountResponse.status !== 200) {
                    console.log('Error fetching download count. Response status: "%s"', url, downloadCountResponse.status);
                    return;
                  }

                  // Examine the text in the response
                  downloadCountResponse.json().then((downloadCountData) => {
                    console.log(downloadCountData);
                    const downloadCount = downloadCountData[0].downloads;
                    title = `${title} [${prettyCount(downloadCount)} DLs]`;
                    titleCache[id] = title;
                    updateTitle();
                  });
                }
              )
              .catch((err) => {
                console.log('Fetch Error :-S', err);
              });
          }

          titleCache[id] = title;
          updateTitle();
          // delete requests[id];
        });
      })
      .catch((err) => {
        console.log('Fetch Error :-S', err);
      });
  }

  // update the title, whatever happened
  updateTitle();
  console.log(titleCache);
}

$('a').hoverIntent({ over: cranmoHoverIn, out: cranmoHoverOut, interval: 200 });
