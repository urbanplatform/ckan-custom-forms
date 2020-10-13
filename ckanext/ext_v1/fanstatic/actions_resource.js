/*
This file is responsible for fill the questionnaires with the correct information, use a specific format for
the different type of questions and organize it by several phases, depending on the json stored in the templating
dataset. For now, it only accepts input text and radio buttons
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
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    if ((data.result) && (data.result.hasOwnProperty("user_logged"))) {
                        api_ckan_key = data.result["user_logged"]["apikey"];
                    }
                    $.ajax({
                        url: url + 'api/3/action/get_user_role',
                        type: 'GET',
                        data: { "dataset_id": dataset_id },
                        contentType: "application/json",
                        success: function (data) {
                            role_user = data.result["user_role"];
                            // Ajax request (GET) to get resource data
                            $.ajax({
                                url: url + 'dataset/' + dataset_id + '/resource/' + resource_id + '/download/' + type_quest,
                                type: 'GET',
                                headers: {
                                    "Authorization": api_ckan_key
                                },
                                success: function (data) {
                                    if (data.pages.filter(page => page["name"] == "Init" || page["elements"].find(obj => obj.hasOwnProperty("type"))["type"] === "comment").length > 0) {
                                        //display button and introduction text
                                        $("#text-initial-presentation").css("display", "block");
                                        $(".form-actions").css("display", "block");
                                        //Fill progress bar
                                        $("#all_stages").append("\
                                        <li class=\"first active\" id=\"first_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.pages).length + 1)) + "% !important;\">\
                                        <span class=\"highlight\">Start questionnaire</span>\
                                        </li>");

                                        let count_class_staging = 2;
                                        for (var i = 0; i < data.pages.length; i++) {
                                            // In case of this page be the presentation one
                                            if (data.pages[i]["name"] == "Init" || i == 0) {
                                                for (var element = 0; element < data.pages[i]["elements"].length; element++) {
                                                    $("#all_stages").append("\
                                                        <li class=\""+ translate_num(count_class_staging) + " uncomplete\" id=\"" + translate_num(count_class_staging) + "_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.pages).length + 1)) + "% !important; \">\
                                                            <span class=\"highlight\"> "+ data.pages[i]["elements"][element]["title"] + "</span >\
                                                        </li>");
                                                    count_class_staging += 1;
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
                                                // Fill the questionnaire with the rest pages separated by phases
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
                                    else {
                                        message_bad_quest();
                                    }


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

            function message_bad_quest() {
                /* Message to warning the user that the questionnaire has a wrong structure */
                // Verify if the user is admin to return an hint message in the board. Otherwise just return that the questionnaire is unavailable
                $("#text-initial-presentation").css("display", "none");
                $(".form-actions").css("display", "none");
                console.log(role_user)
                if (role_user == "admin") {
                    //if is admin
                    $("#quest_content_form").append("\
                    <div class=\"panel-group\" id=\"wrong_quest\" aria-multiselectable=\"true\" style=\"display: block; text-align: center;\">\
                    <h3>Please verify the file associated to this questionnaire</h3>\
                    <p>The following questionnaire has a bad structure. Please go to <a href=\"https://surveyjs.io/Examples/Survey-Creator\">Survey JS Generator</a> and import the data file to review\
                    and fix the it.</p><p>For more information, please <a href=\"/Survey-Helper.pdf\" download >download and read this file</a></p>\
                    <p>Download the json example <a href=\"/Example-Survey.json\" download >HERE</a></p>");
                }
                else {
                    // if is member or non registered user
                    $("#quest_content_form").append("\
                    <div class=\"panel-group\" id=\"wrong_quest\" aria-multiselectable=\"true\" style=\"display: block; text-align: center;\">\
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
                        var table_in = transform_subtitle_id(subtitle);
                        let last_op = "";
                        let first_table_from_subtype = true;
                        if (key == "name")
                            subtitle = val;
                        if (key == "elements") {
                            for (var question = 0; question < val.length; question++) {
                                let is_required = false;
                                if (val[question]["isRequired"] == true)
                                    is_required = true;

                                if (val[question]["type"] == "text") {
                                    last_op = "input_text";
                                    var quest_text = " <div class=\"row input_text\">\
                                        <div class=\"text col-md-12\" style=\"text-align:center\">\
                                            <label>"+ val[question]["title"] + (is_required == true ? "*" : "") + "</label>\
                                        </div >\
                                        <div class=\"text col-md-12\" style=\"margin-top:8px\">\
                                            <textarea style=\"width:100%; resize: none;\" placeholder=\"Please, write the answer here...\" rows=\"4\" id=\""+ generate_id_page(page["name"]) + "_" + num_quests + "\" name=\"opt_" + generate_id_page(page["name"]) + "_" + num_quests + "\" ></textarea>\
                                        </div >\
                                    </div>";
                                    $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append(quest_text);
                                }
                                else {
                                    var tds = [];
                                    let temp_trs = "";
                                    let op_type = "";
                                    for (var op = 0; op < val[question]["choices"].length; op++) {
                                        tds.push("<td>\
                                                <div class=\"radio\">\
                                                    <input type=\"radio\" id=\""+ generate_id_page(page["name"]) + "_" + num_quests + "\" name=\"opt_" + generate_id_page(page["name"]) + "_" + num_quests + "\" value=" + val[question]["choices"][op]["value"] + " >\
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
                                        <th scope=\"row\">"+ val[question]["title"] + (is_required == true ? "*" : "") + "</th>" + tds + "\
                                        </tr>";

                                    var id_table = "";
                                    //In case of table were already created
                                    if ((table_in == localStorage.getItem('last_table_in') || "") && last_op == op_type) {
                                        if ("description" in val[question] && val[question]["description"] == localStorage.getItem('atual_table_description')) {
                                            //if last options used its equal to actual options
                                            //just add row to the table
                                            id_table = table_in + "_" + localStorage.getItem('num_tables');
                                            $("#" + id_table + " tbody").append(add_row);
                                        }
                                        else if ("description" in val[question]) {
                                            localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                                            id_table = table_in + "_" + localStorage.getItem('num_tables');
                                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("\
                                                    <div class=\"panel-heading\">" + generate_subtitle_of_question(val[question], subtitle) + "</div>");

                                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("\
                                                    <table class=\"table\" id=\"" + id_table + "\">\
                                                    <thead></thead><tbody></tbody></table>");
                                            $("#" + id_table + " thead").append(trs);
                                            $("#" + id_table + " tbody").append(add_row);
                                            localStorage.setItem('last_table_in', table_in);
                                            last_op = op_type.toLowerCase();
                                            localStorage.setItem('atual_table_description', val[question]["description"]);
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

                                        if (first_table_from_subtype == true) {
                                            $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("<p class=\"subtypes\">" + subtitle + "</p>");
                                            first_table_from_subtype = false;
                                        }
                                        localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                                        id_table = table_in + "_" + localStorage.getItem('num_tables');
                                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("\
                                                <div class=\"panel-heading\">" + generate_subtitle_of_question(val[question], subtitle) + "</div>");

                                        $("#" + generate_id_page(page["name"]) + "_quest #all_tables .panel-default").append("\
                                                <table class=\"table\" id=\"" + id_table + "\">\
                                                <thead></thead><tbody></tbody></table>");
                                        $("#" + id_table + " thead").append(trs);
                                        $("#" + id_table + " tbody").append(add_row);
                                        localStorage.setItem('last_table_in', table_in);
                                        last_op = op_type.toLowerCase();
                                        if ("description" in val[question])
                                            localStorage.setItem('atual_table_description', val[question]["description"]);

                                    }
                                }

                                num_quests += 1;
                            }
                            //Set local storage variables to initial values
                            localStorage.setItem('num_tables', parseInt(0));
                            localStorage.setItem('last_table_in', "");
                            localStorage.setItem('atual_table_description', "");
                        }

                    });


                }
                divs_modules.push(generate_id_page(page["name"]));
            }

            // Add questionnaire type to the form title
            $("#form-title").append(translate_type_to_title(type_quest));
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
                if ($('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default tbody').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default tbody tr').each(function () {
                        if ((!$(this).find('input[type="radio"]').is(":checked")) && ($(this).find('th').text().slice(-1) == "*")) {
                            all_fill = false;
                            return all_fill;
                        }
                    });
                }
                if (all_fill && $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_text').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_text ').each(function () {
                        if (($(this).find('textarea').val() == "") && ($(this).find('label').text().slice(-1) == "*")) {
                            all_fill = false;
                            return all_fill;
                        }
                    });
                }
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
                if ($('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default tbody').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default tbody tr').each(function () {
                        if ((!$(this).find('input[type="radio"]').is(":checked")) && ($(this).find('th').text().slice(-1) == "*")) {
                            all_fill = false;
                            return all_fill;
                        }
                    });
                }
                if (all_fill && $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_text').length > 0) {
                    $('#' + divs_modules[count_clicks] + "_quest" + ' .panel-default .input_text ').each(function () {
                        if (($(this).find('textarea').val() == "") && ($(this).find('label').text().slice(-1) == "*")) {
                            all_fill = false;
                            return all_fill;
                        }
                    });
                }
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