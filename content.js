var maxRequests = 10;
var popup = null;
var popupLinkID = null;
var popupLink = null;
var requests = {};
var titleCache = {};
var showDownloadCounts = true;

var cranPackageLinkRegex = /^(?:https?:\/\/)?(?:cran\.)(.+)\/(?:web\/packages\/)([\w.-]+)/;
var cranInfoURL = 'https://cran.r-project.org/web/packages/';


function packageName(url) {
	var p = /^(?:https?:\/\/)?(?:cran\.)(.+)\/(?:web\/packages\/)([\w.-]+)/;


	return (url.match(p)) ? RegExp.$2 : false;
}
function prettyCount(sum) {
	if (sum >= 1000000) {
sum = Math.round(sum / 100000) / 10 + 'M';
	} else if (sum >= 10000) {
sum = Math.round(sum / 1000) + 'K';
	}
	return sum;
}

function createPopup() {
	var p = $('<div>');
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
	if (!popup)
		return;

	var title = titleCache[popupLinkID];
	if (title) {
		popup.text(title);

	} else if (requests[popupLinkID])
		popup.text('[Fetching...]');
	else
		popup.text('[Waiting...]');
}

//$(document).on("mouseenter", "a",
function cranmoHoverIn() {
	// check it's a CRAN link
	var id = packageName(this.href);
	if (!id)
		return;

	// create and add popup to document
	if (!popup)
		popup = createPopup();
	$(document.body).parent().append(popup);
	var pos = $(this).offset();
	popup.css({
		top: pos.top - 24,
		left: pos.left
	});

	popupLinkID = id;
	popupLink = this;

	// fetch if haven't already but don't make too many requests to CRAN
	if (!titleCache[id] && !requests[id] && Object.keys(requests).length < maxRequests) {
		// get the title from CRAN
		var url = cranInfoURL + id + "/index.html";

		var xhr = new XMLHttpRequest();

		xhr.onload = function () {
			var title = this.response.body.querySelector('h2').innerText;
			//var pubdate = this.response.body.querySelector($('td:contains("Published")').next('td')[0].innerText;
			var pubnode = Array.prototype.find.call(this.response.body.querySelectorAll("td"), function(element){
				return (element.textContent == "Published:" || element.textContent == "Published")
			});

			var pubdate = "";
			if(pubnode) {
				var nn = pubnode.nextElementSibling;
				if(nn) pubdate = nn.innerText;
			}
			

			title += " [" + pubdate + "]";

			if(showDownloadCounts) {
				$.get({ 
					url: "https://cranlogs.r-pkg.org/downloads/total/2000-01-01:2100-01-01/" + id,
					dataType: 'json',
					async: false,
					success: function( json ) {
						var downloadCount = json[0].downloads;
						title += " [" + prettyCount(downloadCount) + " DLs]";
					}
				});
			}
			titleCache[id] = title;
			updateTitle();
			delete requests[id];
		};

		xhr.onerror = function () {
			console.log('error loading %s', url);
			delete requests[id];
		};

		xhr.open('GET', url);
		xhr.responseType = 'document';
		xhr.send();

		requests[id] = xhr;
	}

	// update the title, whatever happened
	updateTitle();
}
//$(document).on("mouseleave", "a", 
function cranmoHoverOut() {
	if (popup) {
		popup.remove();
		popup = null;
		popupLinkID = null;
		popupLink = null;
	}
}

$("a").hoverIntent({over: cranmoHoverIn, out: cranmoHoverOut, interval: 200 } );
