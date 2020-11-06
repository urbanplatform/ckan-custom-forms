/*
This file is responsible for fill the questionnaires with the correct information. It uses a specific format for
the different type of questions and organize it by several phases, depending on the json stored in the templating
dataset. For now, it only accepts input text, radio buttons, files and html code (geo location only)
*/

"use strict";

ckan.module('actions_resource', function ($) {
    return {
        initialize: function () {
            // CKAN url
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";

            // Get params in the url and instantiate them
            var urlParams = new URLSearchParams(window.location.search);
            var dataset_id = urlParams.get('dataset-id');
            var resource_id = urlParams.get('resource-id');
            var type_quest = urlParams.get('type_quest');

            // Auxiliary variables
            let count_clicks = 0;
            let num_modules = 0;
            let divs_modules = [];

            // Logged user variables
            var api_ckan_key = "";
            var role_user = "";

            // Add questionnaire type to the form title
            $("#form-title").append(translate_type_to_title(type_quest));

            /*
            AJAX GET request to get the apikey from the logged user. In case of
            the being a non-registered user, the apikey will stay blank
            */
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    // Verify if result from request has a user logged to get the apikey
                    if ((data.result) && (data.result.hasOwnProperty("user_logged"))) {
                        api_ckan_key = data.result["user_logged"]["apikey"];
                    }

                    /*
                    AJAX GET request to define the user's role. In case of a non-user or
                    a user from another organization or without any organization, the role
                    will be considered as a member 
                    */
                    $.ajax({
                        url: url + 'api/3/action/get_user_role',
                        type: 'GET',
                        data: { "dataset_id": dataset_id },
                        contentType: "application/json",
                        success: function (data) {
                            // Verify if result from request has a user_role to read
                            if (data.result && data.result.hasOwnProperty("user_role") && data.result["user_role"])
                                role_user = data.result["user_role"];
                            else
                                role_user = "member";

                            // Ajax GET request to get resource data and fill the form
                            $.ajax({
                                url: url + 'dataset/' + dataset_id + '/resource/' + resource_id + '/download/' + type_quest,
                                type: 'GET',
                                headers: {
                                    "Authorization": api_ckan_key
                                },
                                success: function (data) {
                                    // Verify if the questionnaires have the introduction page
                                    if ((data.pages.filter(page => ((page["name"] == "Init" || page["elements"].find(obj => obj.hasOwnProperty("type"))["type"] === "comment")) && !page["type"]).length > 0)
                                        && (data.pages.filter(page => page["elements"].find(obj => obj["type"] != "panel")).length === 1)) {
                                        // Display button and introduction text
                                        $("#text-initial-presentation").css("display", "block");
                                        $(".form-actions").css("display", "block");

                                        // Fill progress bar
                                        $("#all_stages").append("\
                                        <li class=\"first active\" id=\"first_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.pages).length + 1)) + "% !important;\">\
                                        <span class=\"highlight\">Start questionnaire</span>\
                                        </li>");

                                        // Auxiliar variable to count staging phases
                                        let count_class_staging = 2;

                                        for (var i = 0; i < data.pages.length; i++) {
                                            // In case of this page be the introduction one
                                            if (data.pages[i]["name"] == "Init" || i == 0) {
                                                for (var element = 0; element < data.pages[i]["elements"].length; element++) {
                                                    // Fill progress bar
                                                    $("#all_stages").append("\
                                                        <li class=\""+ translate_num(count_class_staging) + " uncomplete\" id=\"" + translate_num(count_class_staging) + "_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.pages).length + 1)) + "% !important; \">\
                                                            <span class=\"highlight\"> "+ data.pages[i]["elements"][element]["title"] + "</span >\
                                                        </li>");
                                                    // Add the filling phase in the progress bar the count var
                                                    count_class_staging += 1;
                                                    // Fill accordion with the pages introductional info
                                                    $("#accordion").append("\
                                                        <div class=\"panel panel-default\">\
                                                            <div class=\"panel-heading\" role=\"tab\" id=\"heading_"+ generate_id_page(data.pages[i]["elements"][element]["name"]) + "\">\
                                                                <h4 class=\"panel-title\">\
                                                                    <a class=\"collapsed\" role=\"button\" data-toggle=\"collapse\" data-parent=\"#accordion\"\
                                                                        href=\"#collapse_"+ generate_id_page(data.pages[i]["elements"][element]["name"]) + "\" aria-expanded=\"false\" aria-controls=\"collapse" + generate_id_page(data.pages[i]["elements"][element]["name"]) + "\">\
                                                                        "+ data.pages[i]["elements"][element]["title"] + "\
                                                                    </a>\
                                                                </h4>\
                                                            </div>\
                                                            <div id=\"collapse_"+ generate_id_page(data.pages[i]["elements"][element]["name"]) + "\" class=\"panel-collapse collapse\" role=\"tabpanel\"\
                                                                aria-labelledby=\"heading_"+ generate_id_page(data.pages[i]["elements"][element]["name"]) + "\" style=\"margin-top: 16px; \">\
                                                                <div class=\"container\">\
                                                                    <p>"+ data.pages[i]["elements"][element]["defaultValue"] + " </p>\
                                                                </div>\
                                                            </div>\
                                                        </div>");
                                                }
                                            }
                                            else {
                                                // Fill the questionnaire with the rest of the pages separated by phases
                                                fill_form(data.pages[i]);
                                            }
                                            num_modules += 1;
                                        }

                                        // Add the final stage to the progress bar
                                        $("#all_stages").append("\
                                        <li class=\"last uncomplete\" id=\"last_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.pages).length + 1)) + "% !important;\">\
                                            <span class=\"highlight\">Finish questionnaire</span>\
                                        </li>");
                                    }
                                    /*
                                    In case of the questionnaire doesnt have the correct structure,
                                    depending on the user role, return an error message
                                    */
                                    else {
                                        message_bad_quest();
                                    }

                                    //Stop loader
                                    $("#loader").css('display', 'none');

                                },
                                error: function (data) {
                                    console.log(data);
                                }
                            });
                        },
                        error: function (data) {
                            console.log(data);
                        }
                    });
                },
                error: function (data) {
                    console.log(data);
                }
            });

            /**
             * This function translate an integer to a string
             * @param  {[integer]} num a number between 2 and 7
             * @return {[string]} translation associated to the number received
             */
            function translate_num(num) {
                if (num == 2)
                    return "second";
                if (num == 3)
                    return "third";
                if (num == 4)
                    return "forth";
                if (num == 5)
                    return "fifth";
                if (num == 6)
                    return "sixth";
                if (num == 7)
                    return "seventh";
            }

            /**
             * This function formats a string to be added as a complement in several tags.
             * This will allow to associate different tags for colapse purposes and/or others similar actions 
             * @param  {[string]} title_name String to be formatted
             * @return {[string]} final word to be added
            */
            function generate_id_page(title_name) {
                if (title_name.split(" ").length > 0) {
                    return title_name.split(" ").join("_").toLowerCase();
                }
                return title_name.toLowerCase();
            }

            /**
             * This function fills the content form with a error message.
             * The message warns the user that the questionnaire has a wrong structure (admin role)
             * Member role or non registered user just return that the questionnaire is unavailable
            */
            function message_bad_quest() {
                $("#all_stages").css("display", "none");
                $("#accordion").css("display", "none");
                $("#text-initial-presentation").css("display", "none");
                $(".form-actions").css("display", "none");
                if (role_user == "admin") {
                    // If is admin
                    $("#quest_content_form").append("\
                    <div class=\"panel-group\" id=\"wrong_quest\" aria-multiselectable=\"true\" style=\"display: block; text-align: center;\">\
                    <i class=\"fa fa-exclamation-triangle\" style=\"font-size: 10em;\"></i>\
                    <h3>Please verify the file associated to this questionnaire</h3>\
                    <p>The following questionnaire has a bad structure. Please go to <a href=\"https://surveyjs.io/Examples/Survey-Creator\">Survey JS Generator</a> and import the data file to review\
                    and fix it.</p><p>For more information, please <a href=\"/Survey-Helper.pdf\" download >download and read this file</a></p>\
                    <p>Download the json example <a href=\"/Example-Survey.json\" download >HERE</a></p>");
                }
                else {
                    // If is member or non registered user
                    $("#quest_content_form").append("\
                    <div class=\"panel-group\" id=\"wrong_quest\" aria-multiselectable=\"true\" style=\"display: block; text-align: center;\">\
                    <i class=\"fa fa-eye-slash\" style=\"font-size: 10em;\"></i>\
                    <h3>The current questionnaire is unavailable</h3>\
                    <p>Try again later or contact the organization responsible for the questionnaire.</p>");

                }
            }

            /**
             * This function format a string to get only a specific part of it.
             * @param  {[string]} type_quest String to be formatted
             * @return {[string]} final word to be added
            */
            function translate_type_to_title(type_quest) {
                if (type_quest != "")
                    if (type_quest.includes("_"))
                        return type_quest.charAt(0).toUpperCase() + type_quest.slice(1).split(".")[0].split("_").join(" ");
                    else
                        return type_quest.charAt(0).toUpperCase() + type_quest.slice(1).split(".")[0];
                else
                    return '';
            };

            /**
             * This function format a string to be associated as part of a identifier.
             * @param  {[string]} subtitle String to be formatted
             * @return {[string]} final word to be added
            */
            function transform_subtitle_id(subtitle) {
                return subtitle.split(" ").join("_").toLowerCase();
            }

            /**
             * This function is responsible for deciding which string will be associated as subtitle of each question.
             * @param  {[string]} question String to be formatted
             * @param  {[string]} subtitle String to used if there no description in the question
             * @return {[string]} final word to be added
            */
            function generate_subtitle_of_question(question, subtitle) {
                if ("description" in question)
                    return question["description"];
                return subtitle;
            }

            /**
             * @param  {[string]} op_type String to be formatted
             * @param  {[string]} html_text String to used if there no description in the question
             * @return {[string]} final word to be added
            */
            function organize_strucuture(page, subtitle, html_text, type_question, first_table_from_subtype, op_type = null, last_op = null, table_in = null, add_row = null, trs = null) {
                if (type_question == "radiogroup") {
                    var id_table = "";
                    //In case of table were already created
                    if ((table_in == localStorage.getItem('last_table_in') || "") && last_op.toLowerCase() == op_type.toLowerCase()) {
                        //if table has subtype and its in the same table
                        if ("description" in html_text && html_text["description"] == localStorage.getItem('atual_table_description')) {
                            //if last options used its equal to actual options
                            //just add row to the table
                            id_table = table_in + "_" + localStorage.getItem('num_tables');
                            $("#" + id_table + " tbody").append(add_row);
                        }
                        //If table has subtype
                        else if (!localStorage.getItem('opts') || ((localStorage.getItem('opts').length > 0) && (trs != localStorage.getItem('opts')))) {
                            localStorage.setItem('opts', trs);
                            localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                            id_table = table_in + "_" + localStorage.getItem('num_tables');
                            // Subtype of table <Emotions>
                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("\
                                                    <div class=\"panel-heading\" style=\"background-color: "+ (generate_subtitle_of_question(html_text, subtitle) != subtitle ? "#eeeeee" : "none") + "\"> "
                                + (generate_subtitle_of_question(html_text, subtitle) != subtitle ? generate_subtitle_of_question(html_text, subtitle) : "") + "</div>");

                            // Table 
                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("\
                                                    <table class=\"table\" id=\"" + id_table + "\">\
                                                    <thead></thead><tbody></tbody></table>");
                            $("#" + id_table + " thead").append(trs);
                            $("#" + id_table + " tbody").append(add_row);
                            localStorage.setItem('last_table_in', table_in);
                            last_op = op_type.toLowerCase();
                            localStorage.setItem('atual_table_description', html_text["description"]);
                        }
                        else {
                            //if last options used its equal to actual options
                            //just add row to the table
                            id_table = table_in + "_" + localStorage.getItem('num_tables');
                            $("#" + id_table + " tbody").append(add_row);
                        }
                    }
                    //Create table and add all the tags and information needed 
                    else {
                        localStorage.setItem('opts', trs);
                        if (parseInt(localStorage.getItem('num_tables')) == 0)
                            localStorage.setItem('lastSubtitle', '');
                        //New group with a subtitle defining it
                        if (localStorage.getItem('lastSubtitle') != first_table_from_subtype) {
                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("<div id=\"group_" + transform_subtitle_id(subtitle) + "\" class=\"radio_group_questions\"</div>");
                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("<p class=\"subtypes\">" + subtitle + "</p>");
                            localStorage.setItem('lastSubtitle', first_table_from_subtype);
                        }
                        localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                        id_table = table_in + "_" + localStorage.getItem('num_tables');
                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("\
                                                <div class=\"panel-heading\" style=\"background-color: "+ (generate_subtitle_of_question(html_text, subtitle) != subtitle ? "#eeeeee" : "none") + "\">"
                            + (generate_subtitle_of_question(html_text, subtitle) != subtitle ? generate_subtitle_of_question(html_text, subtitle) : "") + "</div>");

                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("\
                                                <table class=\"table\" id=\"" + id_table + "\">\
                                                <thead></thead><tbody></tbody></table>");
                        $("#" + id_table + " thead").append(trs);
                        $("#" + id_table + " tbody").append(add_row);
                        localStorage.setItem('last_table_in', table_in);
                        last_op = op_type.toLowerCase();
                        if ("description" in html_text)
                            localStorage.setItem('atual_table_description', html_text["description"]);

                    }
                }
                else if (type_question == "text" || type_question == "file") {
                    if (parseInt(localStorage.getItem('num_tables')) == 0)
                        localStorage.setItem('lastSubtitle', '');

                    if (localStorage.getItem('lastSubtitle') != first_table_from_subtype) {
                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("<div id=\"group_" + transform_subtitle_id(subtitle) + "\" class=\"radio_group_questions\"</div>");
                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("<p class=\"subtypes\">" + subtitle + "</p>");
                        localStorage.setItem('lastSubtitle', first_table_from_subtype);
                    }
                    localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                    $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append(html_text);
                    localStorage.setItem('last_table_in', table_in);
                    last_op = "text_question";
                }
                else if (type_question == "html") {
                    if (parseInt(localStorage.getItem('num_tables')) == 0)
                        localStorage.setItem('lastSubtitle', '');

                    if (localStorage.getItem('lastSubtitle') != first_table_from_subtype) {
                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("<div id=\"group_" + transform_subtitle_id(subtitle) + "\" class=\"radio_group_questions\"</div>");
                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append("<p class=\"subtypes\">" + subtitle + "</p>");
                        localStorage.setItem('lastSubtitle', first_table_from_subtype);
                    }
                    localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                    $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default #group_" + transform_subtitle_id(subtitle) + "").append(html_text);
                    localStorage.setItem('last_table_in', table_in);
                    last_op = "html_question";
                }

                return last_op
            }

            /**
             * This function is responsible for filling the consequent questionnaire form.
             * @param  {[object]} page all the information in one page of the questionnaire
            */
            function fill_form(page) {
                // Add the name of the page as title and static data for a specific phase
                $("#quest_content_form").append("\
                <div class=\"panel-group\" id=\""+ generate_id_page(page["name"]) + "_quest\" aria-multiselectable=\"true\" style=\"display: none;\">\
                    <h3>"+ page["name"] + "</h3>\
                    <p>Fill the following tables with a unique response by clicking in one option per row</p>\
                    <p class=\"questions_mandatory\">-- Questions with * are mandatory --</p>\
                    <div id=\"all_tables\">\
                    <div class=\"panel panel-default\" >\
                    </div>\
                </div>");

                let subtitle = "";
                let num_quests = 1;
                //For each question in list, append row to the table with consequent options
                for (var panel = 0; panel < page["elements"].length; panel++) {
                    jQuery.each(page["elements"][panel], function (key, val) {
                        let last_op = "";
                        let op_type = "";
                        if (key == "name")
                            subtitle = val;
                        var table_in = transform_subtitle_id(subtitle);
                        let first_table_from_subtype = subtitle;
                        if (key == "elements") {
                            for (var question = 0; question < val.length; question++) {
                                let is_required = false;
                                if (val[question]["isRequired"] == true)
                                    is_required = true;

                                // If question is input text
                                if (val[question]["type"] == "text") {
                                    var type_box_class = "";
                                    //if (localStorage.getItem('lastSubtitle') == first_table_from_subtype)
                                    // type_box_class = "input_text_no_box";
                                    // else
                                    type_box_class = "input_text_with_box";

                                    var quest_text = " <div class=\"row input_text " + type_box_class + "\">\
                                        <div class=\"text col-md-12\" style=\"text-align:left\">\
                                            <label>"+ val[question]["title"] + (is_required == true ? "<span style=\"color:red\">*</span>" : "") + "</label>\
                                        </div >\
                                        <div class=\"text col-md-12\" style=\"margin-top:8px\">\
                                            <textarea class=\"text_area_input_text\" rows=1 placeholder=\"Please, write the answer here...\" id=\""+ generate_id_page(page["name"]) + "_" + num_quests + "\" name=\"opt_" + generate_id_page(page["name"]) + "_" + num_quests + "\" ></textarea>\
                                        </div >\
                                    </div>";

                                    last_op = organize_strucuture(page, subtitle, quest_text, val[question]["type"], first_table_from_subtype, op_type, last_op, table_in);
                                    //$("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append(quest_text);
                                    //flexible height
                                    $('.' + type_box_class + ' textarea').on("input", function (e) {
                                        $(this)[0].style.height = $(this)[0].scrollHeight + "px";
                                    });
                                }
                                // If question is input file
                                else if (val[question]["type"] == "file") {
                                    var type_box_class = ""
                                    //if (localStorage.getItem('lastSubtitle') == first_table_from_subtype)
                                    // type_box_class = "input_file_no_box";
                                    // else
                                    type_box_class = "input_file_with_box";

                                    var is_multiple = "";
                                    if (val[question].hasOwnProperty("allowMultiple"))
                                        is_multiple = "multiple"; //val[question]["allowMultiple"];

                                    var file_upload = "\
                                    <div class=\"row  input_file "+ type_box_class + " \">\
                                        <div class=\"text col-md-4\" style=\"text-align:left\">\
                                            <label id=\"input_file_question\">"+ val[question]["title"] + (is_required == true ? "<span style=\"color:red\">*</span>" : "") + "</label>\
                                            <input class=\"file_choose_btn\" type=\"file\" "+ is_multiple + " accept=\"image/png, image/jpeg\" id=\"" + generate_id_page(page["name"]) + "_" + num_quests + "\">\
                                            <label class=\"no_content\" id=\"label_btn_"+ generate_id_page(page["name"]) + "_" + num_quests + "\" for=\"" + generate_id_page(page["name"]) + "_" + num_quests + "\">\
                                            <i style=\"margin-right:8px\" class=\"fa fa-upload\"></i><strong>Choose a file</strong></label>\
                                            <br/>\
                                            <a id=\"delete_"+ generate_id_page(page["name"]) + "_" + num_quests + "\" style=\"display:none\" class=\"delete_files\" ><i style=\"margin-right:8px;\" class=\"fa fa-close\"></i> Empty file storage</a>\
                                        </div >\
                                        <div class=\"text col-md-8 files_miniature\" id=\"" + generate_id_page(page["name"]) + "_" + num_quests + "_files_content\">\
                                        <p style=\"color:#eeeeee; width: 100%; text-align:center; margin-top:16px;\">No file uploaded</p>\
                                        </div >\
                                        </div > ";
                                    last_op = organize_strucuture(page, subtitle, file_upload, val[question]["type"], first_table_from_subtype, op_type, last_op, table_in);

                                    //$("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append(file_upload);
                                    $('.' + type_box_class + ' input[type="file"]').change(function (e) {
                                        var files = this.files;
                                        var id_question_file = $(this).attr('id') + "_files_content";
                                        var id_delete_files = "delete_" + $(this).attr('id');
                                        if (files) {
                                            $('#' + id_delete_files).css('display', 'block');
                                            $("#label_btn_" + $(this).attr('id') + " strong").html("" + files.length + " " + (files.length == 1 ? "file" : "files") + " uploaded");
                                            $('#' + id_question_file).empty();
                                            for (var i = 0; i < files.length; i++) {
                                                var reader = new FileReader();
                                                reader.onload = function (e) {
                                                    $('#' + id_question_file).append('<img class="miniature_img" src="' + e.target.result + '" alt="your image" /> ');
                                                }
                                                reader.readAsDataURL(files[i]);
                                            }
                                        }
                                    });
                                    $('.' + type_box_class + ' .delete_files').click(function (e) {
                                        var delete_btn_id = $(this).attr('id');
                                        var btn_label_id = $(this).attr('id').split("delete_").pop();
                                        var delete_content_id = btn_label_id + "_files_content";
                                        $('#' + delete_content_id).empty();
                                        $('#' + btn_label_id).val('');
                                        $('#' + delete_btn_id).css('display', 'none');
                                        $("#label_btn_" + btn_label_id + " strong").html("Choose a file");
                                    });
                                }
                                // If question is input html
                                else if (val[question]["type"] == "html") {
                                    var type_box_class = "";
                                    //if (localStorage.getItem('lastSubtitle') == first_table_from_subtype)
                                    // type_box_class = "input_file_no_box";
                                    // else
                                    type_box_class = "input_file_with_box";
                                    last_op = "html";
                                    var normal_html = "<div class=\"input_location\" id=" + generate_id_page(page["name"]) + "_" + num_quests + ">"
                                        + val[question]["html"].split("<!--end_div-->")[0] + "</div>";
                                    var api_key_str = val[question]["html"].split("<!--end_div-->")[1];
                                    if (api_key_str.includes("type=") && api_key_str.includes("url=") && api_key_str.includes("key=")) {
                                        var type_geo = api_key_str.split("type=")[1].split(";")[0];
                                        var url_geo = api_key_str.split("url=")[1].split(";")[0];
                                        var key_geo = api_key_str.split("key=")[1].split(";")[0];
                                        // if (key_nominatim.substring(key_nominatim.length - 1) == ";")
                                        //     key_nominatim = key_nominatim.substring(0, key_nominatim.length - 1);
                                        var valid_geo_fields = is_gen_geo_location(type_geo, key_geo, url_geo);
                                        if (!valid_geo_fields)
                                            message_bad_quest();

                                    }
                                    else
                                        message_bad_quest();
                                    last_op = organize_strucuture(page, subtitle, normal_html, val[question]["type"], first_table_from_subtype, op_type, last_op, table_in, add_row, trs);
                                    //$('head').append(scripts);
                                }
                                // If question is input radio group
                                else if (val[question]["type"] == "radiogroup") {
                                    var tds = [];
                                    let temp_trs = "";
                                    for (var op = 0; op < val[question]["choices"].length; op++) {
                                        tds.push("<td>\
                                                <div class=\"radio\">\
                                                    <label class=\"container_radio\">\
                                                        <input type=\"radio\" id=\""+ generate_id_page(page["name"]) + "_" + num_quests + "\" name=\"opt_" + generate_id_page(page["name"]) + "_" + num_quests + "\" value=" + val[question]["choices"][op]["value"] + " >\
                                                        <span class=\"checkmark\"></span>\
                                                    </label>\
                                                    </div >\
                                            </td > ");
                                        temp_trs += "<th scope=\"col\">" + val[question]["choices"][op]["text"] + "</th>";
                                    }
                                    //trs of table with the options of this row
                                    var trs = "<tr>\
                                            <th scope=\"col\"></th>\
                                            "+ temp_trs + "\
                                            </tr>";

                                    //get last option list used to see if the row is gonna be added to the same table
                                    op_type = val[question]["choices"][0]["value"];
                                    if (last_op == "")
                                        last_op = op_type;


                                    //Variable with the question row code
                                    var add_row = "<tr>\
                                        <th scope=\"row\">"+ val[question]["title"] + (is_required == true ? "<span style=\"color:red\">*</span>" : "") + "</th>" + tds + "\
                                        </tr>";

                                    last_op = organize_strucuture(page, subtitle, val[question], val[question]["type"], first_table_from_subtype, op_type, last_op, table_in, add_row, trs);
                                }

                                num_quests += 1;
                            }
                            //Set local storage variables to initial values
                            localStorage.setItem('num_tables', parseInt(0));
                            localStorage.setItem('last_table_in', "");
                            localStorage.setItem('atual_table_description', "");
                            localStorage.setItem('opts', []);
                        }

                    });


                }
                divs_modules.push(generate_id_page(page["name"]));
            }

            /**
             * This function verify if all mandatory questions were answered.
             * @return {[boolean]} True if all mandatory questions were answered. Otherwise, it returns False
            */
            function is_all_fill() {
                let filled = true;

                // Radio group questions
                if (filled && $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default tbody').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default tbody tr').each(function () {
                        if ((!$(this).find('input[type="radio"]').is(":checked")) && ($(this).find('th').text().slice(-1) == "*")) {
                            filled = false;
                        }
                    });
                }

                // Input text questions
                if (filled && $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_text').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_text ').each(function () {
                        if (($(this).find('textarea').val() == "") && ($(this).find('label').text().slice(-1) == "*")) {
                            filled = false;
                        }
                    });
                }

                // Files questions
                if (filled && $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_file_with_box').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_file_with_box ').each(function () {
                        var question_label = "input_file_question";
                        if (($(this).find('input[type="file"]')[0].files.length === 0) && ($(this).find('#' + question_label).text().slice(-1) == "*")) {
                            filled = false;
                        }
                    });
                }

                // HTML questions
                if (filled && $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_location').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_location ').each(function () {
                        if (($(this).find('textarea').val() == "") && ($(this).find('label').text().slice(-1) == "*")) {
                            filled = false;
                        }
                    });
                }
                return filled;
            }

            // Function to cancel the questionnaire and redirect to index page
            $("#cancel_quest").on("click", function () {
                window.location.href = "/";
            })

            //Function on clicking in the start questionnaire button
            $("#start_quest").on("click", function () {
                $("#start_quest").css("display", "none");
                $("#accordion").css("display", "none");
                $("#second_stage").removeClass("uncomplete");
                $("#second_stage").addClass("active");
                if (num_modules <= 2)
                    $("#finalize_quest").css("display", "inline-block");
                else
                    $("#next_quest").css("display", "inline-block");
                $("#" + divs_modules[count_clicks] + "_quest").css("display", "block");
                window.scrollTo(0, 0);
            });

            //Function on clicking in button "Next"
            $("#next_quest").on("click", function () {
                let all_fill = true;

                //Verify if this module its totally filled
                all_fill = is_all_fill();

                //If module is totally filled
                if (all_fill) {
                    $("#" + divs_modules[(count_clicks)] + "_quest").css("display", "none");
                    count_clicks += 1;
                    $("#text-initial-presentation").css("display", "none");
                    $(".saving_loader").css("display", "none");
                    $("#loader").css("display", "block");
                    setTimeout(function () {
                        $("#loader").css("display", "none");
                        $("#third_stage").removeClass("uncomplete");
                        $("#third_stage").addClass("active");
                        $("#next_quest").css("display", "none");
                        $("#finalize_quest").css("display", "inline-block");
                        $("#" + divs_modules[count_clicks] + "_quest").css("display", "block");
                        $(".saving_loader").css("display", "block");
                        window.scrollTo(0, 0);
                    }, 1500);
                }
                else {
                    alert("Answer to all the question please!");
                    return false;
                }
            });

            //Function on clicking in button "Finalize"
            $("#finalize_quest").on("click", function () {
                let all_fill = true;

                //Verify if this module its totally filled
                all_fill = is_all_fill();

                //If module is totally filled
                if (all_fill) {
                    $("#" + divs_modules[(divs_modules.length - 1)] + "_quest").css("display", "none");
                    $("#text-initial-presentation").css("display", "none");
                    $(".saving_loader").css("display", "none");
                    $("#loader").css("display", "block");
                    setTimeout(function () {
                        $("#loader").css("display", "none");
                        $("#last_stage").removeClass("uncomplete");
                        $("#last_stage").addClass("active");
                        $("#finalize_quest").css("display", "none");
                        $("#submitForm").css("display", "inline-block");
                        $("#finish_quest").css("display", "block");
                        $("#text-initial-presentation").css("display", "none");
                        $(".saving_loader").css("display", "block");
                        window.scrollTo(0, 0);
                    }, 1500);
                }
                else {
                    alert("Answer to all the question please!");
                }
            });

        }

    }
});