//  JAVASCRIPT FOR SIDE PAGES

var darkmode = 'none';

//  When the DOM is ready
$(document).ready(function () {

    //  Create tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    //  Setup light or dark mode through localstorage
    if (localStorage.getItem('darkmode') != null) {
        darkmode = localStorage.getItem('darkmode');
    }

    if (darkmode == 'none') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
            darkmode = 'true';
        else
            darkmode = 'false'

        localStorage.setItem('darkmode', darkmode);
    }

    if (darkmode == 'true') {
        if (document.body.classList.contains("enabled"))
            document.body.classList.remove("enabled");
    }
    else
    {
        if (!document.body.classList.contains("enabled"))
            document.body.classList.add("enabled");
    }
});
