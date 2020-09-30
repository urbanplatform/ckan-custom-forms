/*
This file is responsible for manage the all the questionnaires listed in main page
as well the organization section, that can only been seen by admins
*/
"use strict";

ckan.module('list_questionnaires', function ($) {
    return {
        initialize: function () {
            //Get path of url to know the type of the questionnaire
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";

            function getCookie(cname) {
                var name = cname + "=";
                var ca = document.cookie.split(';');
                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ') {
                        c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                        return c.substring(name.length, c.length);
                    }
                }
                return "";
            }

            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    var is_user = getCookie("ckan");
                    if (is_user) {
                        var user = data.result["user_logged"];
                        // if (user["sysadmin"] == true) {
                        //     $("#organization-datasets").css("display", "block");
                        // }
                        //Call questionnaires from specific dataset on staging
                        $.ajax({
                            url: url + 'api/3/action/current_package_list_with_resources',
                            type: 'GET',
                            headers: {
                                "Authorization": user["apikey"]
                            },
                            success: function (data) {
                                data.result.forEach(function (dataset) {
                                    if (dataset.creator_user_id == user["id"]) {
                                        $("#organization-datasets").css("display", "block");
                                    }
                                    if ("extras" in dataset) {
                                        dataset.extras.forEach(function (extra) {
                                            if ((extra["key"] == "is_templating" && extra["value"] == "true") && (dataset.resources.length > 0)) {

                                                dataset.resources.forEach(function (resource) {
                                                    var json_info = {
                                                        "name": resource.name,
                                                        "description": resource.description,
                                                        "id": resource.id
                                                    };
                                                    populate_list_html(dataset.id, json_info);
                                                });
                                            }
                                            else {
                                                $("#list-quests").append("There are no questionnaires available. Please try again later");
                                            }
                                        });
                                    }

                                });
                            },
                            error: function (data) {
                                console.log(data);
                            }
                        });

                        function define_title_word_questionnaire(string_field) {
                            if (string_field != "") {
                                if (string_field.split(".").length > 1)
                                    return string_field.charAt(0).toUpperCase() + string_field.slice(1).split('.')[0];
                                else
                                    return string_field.charAt(0).toUpperCase() + string_field.slice(1).split('_');
                            }
                            else {
                                return "Unknown title";
                            }
                        }

                        function define_description_questionnaire(string_field) {
                            if (string_field != "") {
                                return string_field.charAt(0).toUpperCase() + string_field.slice(1);
                            }
                            else {
                                return "Descrição disponível em breve";
                            }
                        }

                        function randomColor() {
                            var list_potential_colors = ["primary", "info", "success"];
                            return list_potential_colors[Math.floor(Math.random() * list_potential_colors.length)];
                        }

                        //Populate div with all available questionnaires 
                        function populate_list_html(dataset_id, json_info) {
                            var title = define_title_word_questionnaire(json_info.name);
                            var description_quest = define_description_questionnaire(json_info.description);
                            $("#list-quests").append("\
                            <li class=\"dataset-item module-content\">\
                                <div class=\"dataset-content\">\
                                    <h3 class=\"dataset-heading\">\
                                        <span class=\"dataset-private label label-"+ randomColor() + "\">\
                                            <i class=\"fa fa-user-md\"></i>\
                                            "+ title + "\
                                    </span>\
                                        <a href=\"/questionnaire?dataset-id="+ dataset_id + "&resource-id=" + json_info.id + "&type_quest=" + json_info.name + "\">" + title + " Questionnaire</a>\
                                    </h3>\
                                    <div>"+ description_quest + "</div>\
                                </div>\
                            </li>");
                        }
                    }
                    else {
                        $("#organization-datasets").css("display", "none");
                        $("#quest_section_init page-heading").text("List of questionnaires");
                        $("#list-quests").append("Please log in to get access to the questionnaires");

                    }

                },
                error: function (data) {
                    console.log(data);
                }
            });

        }
    }

});