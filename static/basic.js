//  JAVASCRIPT FOR SIDE PAGES

//  When the DOM is ready
$(document).ready(function () {

    //  Create tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    //  Dark mode on page load if the browser is in dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        if (document.body.classList.contains("enabled"))
            document.body.classList.remove("enabled");
    }
    else {
        if (!document.body.classList.contains("enabled"))
            document.body.classList.add("enabled");
    }
});
