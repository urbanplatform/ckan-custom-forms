"use strict";

ckan.module('actions_resource', function ($) {
    return {
        initialize: function () {
            //ckan API Key
            //var api_ckan_key = "4c5e4e41-3056-41cf-9353-7b63438a7fcf";
            var api_ckan_key = "3f5c3706-ca58-4abc-bc32-6758e2509bcc";
            var urlParams = new URLSearchParams(window.location.search);
            var dataset_id = urlParams.get('dataset-id');
            var resource_id = urlParams.get('resource-id');
            var type_quest = urlParams.get('type_quest');
            let num_modules = 0;
            let divs_modules = [];
            function translate_num(num) {
                if (num == 2)
                    return "second";
                if (num == 3)
                    return "third";
                if (num == 4)
                    return "forth"
            }

            $.ajax({
                //url: 'http://ckan.staging.ubiwhere.com/api/3/action/current_package_list_with_resources',
                url: 'http://127.0.0.1:7000/dataset/' + dataset_id + '/resource/' + resource_id + '/download/' + type_quest,
                type: 'GET',
                headers: {
                    "Authorization": api_ckan_key
                },
                success: function (data) {
                    //Fill staging
                    $("#all_stages").append("\
                        <li class=\"first active\" id=\"first_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.questions).length + 2)) + "% !important;\">\
                        <span class=\"highlight\">Start questionnaire</span>\
                    </li>");
                    let count_class_staging = 2;
                    Object.keys(data.questions).forEach(function (key) {
                        $("#all_stages").append("\
                        <li class=\""+ translate_num(count_class_staging) + " uncomplete\" id=\"" + translate_num(count_class_staging) + "_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.questions).length + 2)) + "% !important; \">\
                            <span class=\"highlight\"> "+ data.questions[key]["name"] + "</span >\
                        </li>");
                        count_class_staging += 1;
                        $("#accordion").append("\
                        <div class=\"panel panel-default\">\
                            <div class=\"panel-heading\" role=\"tab\" id=\"heading"+ key + "\">\
                                <h4 class=\"panel-title\">\
                                    <a class=\"collapsed\" role=\"button\" data-toggle=\"collapse\" data-parent=\"#accordion\"\
                                        href=\"#collapse"+ key + "\" aria-expanded=\"false\" aria-controls=\"collapse" + key + "\">\
                                        "+ data.questions[key]["name"] + "\
                                    </a>\
                                </h4>\
                            </div>\
                            <div id=\"collapse"+ key + "\" class=\"panel-collapse collapse\" role=\"tabpanel\"\
                                aria-labelledby=\"heading"+ key + "\" style=\"margin-top: 16px; \">\
                                <div class=\"container\">\
                                    <p>"+ data.questions[key]["description"] + " </p>\
                                </div>\
                            </div>\
                        </div>");
                        // Fill the questionnaire form by key
                        fill_form(key, data.questions[key]);
                        num_modules += 1;

                    });
                    $("#all_stages").append("\
                    <li class=\"last uncomplete\" id=\"last_stage\" style=\"width: " + Math.floor(100 / (Object.keys(data.questions).length + 2)) + "% !important;\">\
                        <span class=\"highlight\">Finish questionnaire</span>\
                    </li>");


                },
                error: function (data) {
                    console.log(data);
                }
            });

            function translate_type(type_quest) {
                if (type_quest != "")
                    if (type_quest.includes("_"))
                        return type_quest.charAt(0).toUpperCase() + type_quest.slice(1).split(".")[0].split("_")[0];
                    else
                        if (type_quest.includes(" "))
                            return type_quest.charAt(0).toUpperCase() + type_quest.slice(1).split(".")[0].split(" ")[0];
                        else
                            return type_quest.charAt(0).toUpperCase() + type_quest.slice(1).split(".")[0];
                else
                    return '';
            };

            function transform_subtitle_id(subtitle) {
                return subtitle.split(" ").join("_").toLowerCase();
            }

            function get_last_op_id(val) {
                return val[0].toLowerCase() + "_" + val[(val.length - 1)].toLowerCase();
            }

            //Fill the consequent questionnaire form
            function fill_form(type_quest, questions) {
                $("#quest_content_form").append("\
                <div class=\"panel-group\" id=\""+ type_quest + "_quest\" aria-multiselectable=\"true\" style=\"display: none;\">\
                    <h3>"+ questions["name"] + "</h3>\
                    <p>Fill the following tables with a unique response by clicking in one option per row</p>\
                    <p class=\"questions_mandatory\">**All questions are mandatory**</p>\
                    <div id=\"all_tables\">\
                    <div class=\"panel panel-default\" >\
                    </div>\
                </div>");

                let temp_type = "";
                let count_subtitles = 1;
                //For each question in list, append row to the table with consequent options
                jQuery.each(questions["result"], function (key, val) {
                    let subtitle = key;
                    var table_in = transform_subtitle_id(key);
                    let last_op = "";
                    let first_table_from_subtype = true;
                    for (var u = 0; u < val.length; u++) {
                        var tds = [];
                        let temp_trs = "";
                        let op_type = "";
                        for (var op = 0; op < val[u]["options"].length; op++) {
                            tds.push("<td>\
                                <div class=\"radio\">\
                                    <input type=\"radio\" id=\""+ type_quest + "_" + u + "\" name=\"opt_" + type_quest + "_" + u + "\" value=" + val[u]["options"][op].replace(" ", "_").toLowerCase() + " >\
                                </div >\
                            </td > ");
                            temp_trs += "<th scope=\"col\">" + val[u]["options"][op] + "</th>";
                        }
                        //trs of table with the options of this row
                        var trs = "<tr>\
                            <th scope=\"col\"></th>\
                            "+ temp_trs + "\
                            </tr>";

                        //get last option list used to see if the row is gonna be added to the same table
                        op_type = get_last_op_id(val[u]["options"]);
                        if (last_op == "")
                            last_op = op_type;


                        //Variable with the question row code
                        var add_row = "<tr>\
                        <th scope=\"row\">"+ val[u].description + "</th>" + tds + "\
                        </tr>";

                        var id_table = "";
                        //In case of table were already created
                        if ((table_in == localStorage.getItem('last_table_in') || "") && last_op == op_type) {
                            //if last options used its equal to actual options
                            //just add row to the table
                            id_table = table_in + "_" + localStorage.getItem('num_tables');
                            $("#" + id_table + " tbody").append(add_row);
                        }
                        //Create table and add all the tags and information needed 
                        else {
                            if (id_table == "aaa") {
                                localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                                id_table = table_in + "_" + localStorage.getItem('num_tables');
                            }
                            else {
                                if (first_table_from_subtype == true) {
                                    $("#" + type_quest + "_quest #all_tables .panel-default").append("<p class=\"subtypes\">" + count_subtitles + ") " + subtitle + "</p>");
                                    first_table_from_subtype = false;
                                }
                                localStorage.setItem('num_tables', (parseInt(localStorage.getItem('num_tables')) + 1));
                                id_table = table_in + "_" + localStorage.getItem('num_tables');
                                $("#" + type_quest + "_quest #all_tables .panel-default").append("\
                                <div class=\"panel-heading\">" + subtitle + "</div>");

                                $("#" + type_quest + "_quest #all_tables .panel-default").append("\
                                <table class=\"table\" id=\"" + id_table + "\">\
                                <thead></thead><tbody></tbody></table>");
                                $("#" + id_table + " thead").append(trs);
                                $("#" + id_table + " tbody").append(add_row);
                                localStorage.setItem('last_table_in', table_in);
                                last_op = op_type.toLowerCase();
                            }

                        }

                    }
                    count_subtitles += 1;

                });
                //Set local storage variables to initial values
                localStorage.setItem('num_tables', parseInt(0));
                localStorage.setItem('last_table_in', "");

                divs_modules.push(type_quest + "_quest");
            }

            // Add questionnaire type to the form title
            $("#form-title").append(translate_type(type_quest));
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
                if (num_modules == 1)
                    $("#finalize_quest").css("display", "inline-block");
                else
                    $("#next_quest").css("display", "inline-block");
                $("#" + divs_modules[0]).css("display", "block");
                window.scrollTo(0, 0);
            });


            //Function on clicking in button "Next"
            $("#next_quest").on("click", function () {
                let all_fill = true;
                //Verify if this module its totally filled
                $('#' + type_quest + '_quest .panel-default tbody tr').each(function (index) {
                    if (!$(this).find('input[type="radio"]').is(":checked")) {
                        all_fill = false;
                        return all_fill;
                    }
                });
                //If module is totally filled
                if (all_fill) {
                    $("#" + divs_modules[0]).css("display", "none");
                    $("#text-initial-presentation").css("display", "none");
                    $(".saving_loader").css("display", "none");
                    $("#loader").css("display", "block");
                    setTimeout(function () {
                        $("#loader").css("display", "none");
                        $("#third_stage").removeClass("uncomplete");
                        $("#third_stage").addClass("active");
                        $("#next_quest").css("display", "none");
                        $("#finalize_quest").css("display", "inline-block");
                        $("#" + divs_modules[1]).css("display", "block");
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
                $('#' + type_quest + '_quest .panel-default tbody tr').each(function (index) {
                    if (!$(this).find('input[type="radio"]').is(":checked")) {
                        all_fill = false;
                        return all_fill;
                    }
                });
                //If module is totally filled
                if (all_fill) {
                    $("#" + divs_modules[(divs_modules.length - 1)]).css("display", "none");
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