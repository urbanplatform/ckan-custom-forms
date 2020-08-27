"use strict";

ckan.module('list_questionnaires', function ($) {
    return {
        initialize: function () {
            //ckan API Key
            var api_ckan_key = "3f5c3706-ca58-4abc-bc32-6758e2509bcc";
            //var api_ckan_key = "4c5e4e41-3056-41cf-9353-7b63438a7fcf";
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";
            //Get path of url to know the type of the questionnaire
            //Call questionnaires from specific dataset on staging

            $.ajax({
                //url: 'http://ckan.staging.ubiwhere.com/api/3/action/current_package_list_with_resources',
                url: url + 'api/3/action/current_package_list_with_resources',
                type: 'GET',
                headers: {
                    "Authorization": api_ckan_key
                },
                success: function (data) {
                    console.log(data.result);
                    data.result.forEach(function (dataset) {
                        if ("extras" in dataset) {
                            dataset.extras.forEach(function (extra) {
                                if (extra["key"] == "is_templating" && extra["value"] == "true") {
                                    dataset.resources.forEach(function (resource) {
                                        var json_info = {
                                            "name": resource.name,
                                            "description": resource.description,
                                            "id": resource.id
                                        };
                                        populate_list_html(dataset.id, json_info);
                                    });
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
                    if (string_field.split(" ").length > 1)
                        return string_field.charAt(0).toUpperCase() + string_field.slice(1).split(' ')[0];
                    else
                        return string_field.charAt(0).toUpperCase() + string_field.slice(1).split('_')[0];
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
    }

});