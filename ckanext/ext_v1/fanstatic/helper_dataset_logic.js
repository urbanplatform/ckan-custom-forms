"use strict";

ckan.module('helper_dataset_logic', function ($) {
    return {
        initialize: function () {
            console.log("adawdadawddwadawd")
            //Get path of url
            const path = window.location.pathname;
            if (!path.includes("dataset/edit/")) {
                $(".info_div").css("height", "auto");
                $("#helper_dataset").css("display", "none");
            }
        }
    }
});