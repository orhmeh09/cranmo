// Saves options to chrome.storage.sync.
function saveOptions() {
  const settingsObject = {
    showDate: document.getElementById('showDate').checked,
    showDownloadCounts: document.getElementById('showDownloadCounts').checked,
    hoverInterval: document.getElementById('hoverInterval').value
  };

  chrome.storage.sync.set(settingsObject, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    //chrome.extension.getBackgroundPage().window.location.reload();

    setTimeout(() => {
      status.textContent = 'Saving...';
    }, 1250);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  console.log("Restoring Options");
  // Use default value color = 'red' and likesColor = true.
  const settingsObject = {
    showDate: true,
    showDownloadCounts: true,
    hoverInterval: 14444
  };

  chrome.storage.sync.get(settingsObject, (items) => {
    console.log(items);
    document.getElementById('showDate').checked = items.showDate;
    document.getElementById('showDownloadCounts').checked = items.showDownloadCounts;
    document.getElementById('hoverInterval').value = items.hoverInterval;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
//document.addEventListener('load', restoreOptions);

document.getElementById('save').addEventListener('click', saveOptions);
