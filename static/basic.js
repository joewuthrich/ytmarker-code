//  JAVASCRIPT FOR SIDE PAGES

var storage = {};

//  When the DOM is ready
$(document).ready(function () {

    //  Create tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    if (sessionStorage.getItem('video') != null) {
        storage = JSON.parse(sessionStorage.getItem('video'));
    }

    //  Dark mode on page load if the browser is in dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && (storage['darkmode'] == 'true' || storage['darkmode'] == undefined)) {
        if (document.body.classList.contains("enabled"))
            document.body.classList.remove("enabled");
    }
    else
    {
        if (!document.body.classList.contains("enabled"))
            document.body.classList.add("enabled");
    }
});
