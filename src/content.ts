/// <reference path="lib/chrome.index.d.ts"/>

import * as CRANMirrors from "./CRANMirrors.json";



// import CRANMirrors from 'CRAN_mirrors';
/* global CRANMirrors */

function getCRANPackagesURL(key: string = "0-Cloud [https]"): string {
  const baseURL:string = CRANMirrors[key] || CRANMirrors["0-Cloud [https]"];
  return (`${baseURL}/web/packages/`);
}

// function loadStoredOptions() {
//   console.log('Loading stored options...');
//   let result = {};
//   const gettingItem = chrome.storage.sync.get(null, (items) => {
//     result = Object.assign(result, items);
//   });
//   return result;
// }



let cranmoOptions = {
  // urlForCRAN: 'https://cran.r-project.org/web/packages/',
  urlForCRAN: getCRANPackagesURL(),
  urlForDownloadCounts: "https://cranlogs.r-pkg.org/downloads/total/2000-01-01:2100-01-01/",
  downloadCountsInterval: {
    start: new Date(2000, 1, 1),
    end: new Date(2100, 1, 1),
  },
};

function restoreCranmoOptions(ev) {
  console.log("Restoring Cranmo options");
  chrome.storage.sync.get({
    showDate: true,
    showDownloadCounts: true,
    hoverInterval: 200,
  }, (items) => {
    if (typeof items.showDate !== "undefined") cranmoOptions["showDate"] = items.showDate;
    if (typeof items.showDownloadCounts !== "undefined") cranmoOptions["showDownloadCounts"] = items.showDownloadCounts;
    if (typeof items.hoverInterval !== "undefined") cranmoOptions["hoverInterval"] = items.hoverInterval;
    // cranmoOptions = Object.assign(cranmoOptions, items);
  });
}


let popup = null;
let popupLinkID = null;
const requests = {};
let numRequests = 0;

const titleCache = {};

function prettyCount(x: number): string {
  let ds = "";
  if (x >= 1000000) {
    ds = `${Math.round(x / 100000) / 10}M`;
  } else if (x >= 10000) {
    ds = `${Math.round(x / 1000)}K`;
  } else {
    ds = `${x}`;
  }
  return ds;
}

function getPackageName(url): string {
  const p = /^(?:https?:\/\/)?(?:cran\.)(.+)\/(?:web\/packages\/)([\w.-]+)/;
  return (url.match(p)) ? RegExp.$2 : null;
}

function createPopup(): JQuery<HTMLElement> {
  const p = $("<div>");
  p.attr("style",
    "position: absolute;" +
    "pointer-events: none;" +
    "z-index: 19999999999;" +
    "color: black;" +
    "text-decoration: none !important;" +
    "font-size: 16px;" +
    "padding: 2px 4px;" +
    "background-color: #f4f1c2;" +
    "border: 1px dotted #aaa;",
  );
  return p;
}

function updateTitle(): void {
  if (!popup) {
    return;
  }
  const title = titleCache[popupLinkID];
  if (title) {
    popup.text(title);
  } else if (requests[popupLinkID]) {
    popup.text("[Fetching...]");
  } else {
    popup.text("[Waiting...]");
  }
}

function cranmoHoverOut(): void {
  if (popup) {
    popup.remove();
    popup = null;
    popupLinkID = null;
  }
}

function cranmoHoverIn(): void {
  // Check it's a CRAN link
  const id = getPackageName(this.href);
  if (!id) {
    return;
  }

  // Create and add popup to document
  if (!popup) {
    popup = createPopup();
  }

  $(document.body).parent().append(popup);
  // Const rect = popup.getBoundingClientRect();
  // popup.style.cssText = `top: ${(rect.top + document.body.scrollTop) - 24}; left: ${rect.left + document.body.scrollLeft}`;
  const pos = $(this).offset();
  popup.css({
    top: pos.top - 24,
    left: pos.left,
  });

  popupLinkID = id;

  // Fetch if haven't already but don't make too many requests to CRAN
  if (!titleCache[id] && numRequests < cranmoOptions["maxRequests"]) {
    console.log(cranmoOptions);
    // Get the title from CRAN
    const url = `${cranmoOptions.urlForCRAN}${id}/index.html`;
    numRequests += 1;
    fetch(url)
      .then((response) => {
        if (response.status !== 200) {
          console.log("Error fetching \"%s\". Response status: \"%s\"", url, response.status);
          return;
        }

        // Examine the text in the response
        response.text().then((txt) => {
          // Console.log(txt);
          const data = new DOMParser().parseFromString(txt, "text/html");
          let title = data.querySelector("h2").innerText;
          // console.log(title);
          // Let pubdate = this.response.body.querySelector($('td:contains('Published')').next('td')[0].innerText;

          const pubnode = Array.prototype.find.call(data.querySelectorAll("td"),
            (element) => (element.textContent === "Published:" || element.textContent === "Published"));

          let pubdate = "";
          if (pubnode) {
            const nn = pubnode.nextElementSibling;
            if (nn) {
              pubdate = nn.innerText;
            }
          }
          if (cranmoOptions["showDate"]) {
            title = `${title} [${pubdate}]`;
          }

          if (cranmoOptions["showDownloadCounts"]) {
            const downloadCountURL = `${cranmoOptions.urlForDownloadCounts}${id}`;
            fetch(downloadCountURL)
              .then(
                (downloadCountResponse) => {
                  if (downloadCountResponse.status !== 200) {
                    console.log("Error fetching download count. Response status: \"%s\"", url, downloadCountResponse.status);
                    return;
                  }

                  // Examine the text in the response
                  downloadCountResponse.json().then((downloadCountData) => {
                    // console.log(downloadCountData);
                    const downloadCount = downloadCountData[0].downloads;
                    title = `${title} [${prettyCount(downloadCount)} DLs]`;
                    titleCache[id] = title;
                    updateTitle();
                  });
                },
              )
              .catch((err) => {
                console.log("Fetch Error :-S", err);
              });
          }

          titleCache[id] = title;
          updateTitle();
          numRequests -= 1;
        });
      })
      .catch((err) => {
        console.log("Fetch Error :-S", err);
      });
  }

  // Update the title, whatever happened
  updateTitle();
  // console.log(titleCache);
}
document.addEventListener("DOMContentLoaded", restoreCranmoOptions);
document.addEventListener("load", restoreCranmoOptions);

$("a").hoverIntent({ over: cranmoHoverIn, out: cranmoHoverOut, interval: cranmoOptions["hoverInterval"] });

