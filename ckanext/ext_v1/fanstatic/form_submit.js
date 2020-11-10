/*
This file is responsible for the submit of a questionnaire. When a questionnaire is submitted,
it will be stored in a specific resource from a dataset that is marked as a 'is_data_store'.
If the resource doesnt exists in the moment of submission, it is created and then the all
the info is stored there. Otherwise, the resource is updated with a new response. 
*/

"use strict";

ckan.module('form_submit', function ($) {
    return {
        initialize: function () {
            // CKAN url
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";

            // Get organization name
            var urlParams = new URLSearchParams(window.location.search);
            var organization_id = urlParams.get('organization-id');

            // CKAN user apikey
            var api_ckan_key = "";
            var username = "anonymous"

            // AJAX GET request to get apikey and the username from the logged user
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    // If the request result has information about the logged user 
                    if ((data.result) && (data.result.hasOwnProperty("user_logged"))) {
                        api_ckan_key = data.result["user_logged"]["apikey"];
                        username = data.result["user_logged"]["name"]
                    }
                },
                error: function (data) {
                    console.log(data);
                }
            });


            // Function on clicking to submit, save and close questionnaire
            $("#submitForm").click(function () {
                // Get the type of questionnaire string from the title
                var type_quest = $("#form-title").text().toLowerCase().split("-")[1].trim().split(" ").join("_")
                // Object to store files uploaded
                var formData_send = new FormData();
                // Hide div with the final state's text of the questionnaire
                $("#finish_quest").css("display", "none");
                // Show loader
                $("#loader").css("display", "block");
                // Auxiliary variables
                let questions_entity = [];
                var list_with_all_questions_and_answers_ids = [];
                // Get all info from questionnaire
                $('#quest_content_form > div').each(function () {
                    var key = this.id;
                    // Get all checked values from questionnaire tables
                    $("#" + key + " #all_tables tbody tr").each(function () {
                        // Get id row
                        var key_opt = $(this).find('input[type="radio"]').attr("id");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                        if ($(this).find('input[type="radio"]').is(":checked")) {
                            // Get question
                            var row_question = $(this).find('th').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var row_opt = $(this).find('input[type="radio"]:checked').attr("value");
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: row_opt });
                        }

                    });
                    // Get all input texts
                    $("#" + key + " #all_tables .input_text").each(function () {
                        // Get id row
                        var key_opt = $(this).find('textarea').attr("id");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                        if ($(this).find('textarea').val() != "") {
                            // Get question
                            var row_question = $(this).find('label').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var row_opt = $(this).find('textarea').val();
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: row_opt });
                        }
                    });
                    // For files data, create or fill a specific dataset for file storage and get the url to save it as a response
                    $("#" + key + " #all_tables .input_file").each(function () {
                        // Get id row
                        var key_opt = $(this).find('input[type="file"]').attr("id");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                        if ($("#" + key_opt + "").prop('files').length > 0) {
                            // Get question
                            var row_question = $(this).find("label#input_file_question").text().replace('\t', '').replace('*', '');
                            // Get answer by creating or updating a dataset responsible for storing files
                            var form_file_data = new FormData();
                            for (var i = 0; i < $("#" + key_opt + "").prop('files').length; i++) {
                                form_file_data.append($("#" + key_opt + "").prop('files')[i]["name"], $("#" + key_opt + "").prop('files')[i]);
                            }
                            form_file_data.append("organization_id", organization_id);
                            // AJAX POST request to call custom request to store files uploaded
                            $.ajax({
                                async: false,
                                url: url + 'api/3/action/create_dataset_files_resource',
                                type: 'POST',
                                data: form_file_data,
                                contentType: false, // NEEDED (requires jQuery 1.6+)
                                processData: false, // NEEDED
                                success: function (data) {
                                    // Define data structure of questions/answers
                                    questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: data.result["urls"] });
                                }
                            });
                        }
                    });

                    // For geo location. Here is stored the street string
                    $("#" + key + " #all_tables .input_location").each(function () {
                        // Get id row
                        var key_opt = $(this).attr("id");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                        if ($(this).find('textarea').val() != "") {
                            // Get question
                            var row_question = $(this).find('label').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var answer_location_arr = unescape(encodeURIComponent($(this).find('textarea').val())); //.split("<br>");
                            // var final_answer_location = { "longitude": parseFloat(answer_location_arr[0].split(" ")[1]), "latitude": parseFloat(answer_location_arr[1].split(" ")[1]) }
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: answer_location_arr });// JSON.stringify(final_answer_location) });
                        }

                    });
                });

                setTimeout(function () {
                    // Variable to store current date
                    var currentdate_no_timezone = new Date();
                    currentdate_no_timezone = currentdate_no_timezone.getTimezoneOffset();
                    if (currentdate_no_timezone < 0)
                        currentdate_no_timezone = Math.abs(currentdate_no_timezone);
                    else
                        currentdate_no_timezone = -Math.abs(currentdate_no_timezone);
                    var currentdate = new Date();
                    currentdate.setMinutes(currentdate.getMinutes() + currentdate_no_timezone);
                    // Final json structure
                    var final_json_to_send = { "id": type_quest, "info": type_quest + "_quest", "date_submitted": currentdate, "username": username };
                    // Fields that already exists in the final json
                    var fields_resource = [{ "id": "id", "type": "text" }, { "id": "info", "type": "text" }, { "id": "date_submitted", "type": "text" }, { "id": "username", "type": "text" }];
                    // Auxiliar boolean to be able to insert the questions and answer that were answered
                    let it_has_answer = false;

                    list_with_all_questions_and_answers_ids.map((x => {
                        fields_resource.push({ "id": x });
                        // In case of final json doesnt contain the key 'x', add it to the final json
                        // and if has a value, associate it. Otherwise leave it blank
                        if (!final_json_to_send.hasOwnProperty(x)) {
                            questions_entity.forEach(y => {
                                if (y.hasOwnProperty(x)) {
                                    for (const [key, value] of Object.entries(y)) {
                                        if (key == x) {
                                            final_json_to_send[x] = value;
                                            it_has_answer = true;
                                            break;
                                        }
                                    }
                                }
                            });
                            if (!it_has_answer) {
                                final_json_to_send[x] = "";
                            }
                            else
                                it_has_answer = false;
                        }

                    }));
                    // Append needed information to the formData
                    formData_send.append("name_resource", type_quest);
                    formData_send.append("organization_id", organization_id);
                    formData_send.append("result", JSON.stringify(final_json_to_send));
                    // AJAX POST request to call custom request to create and/or insert submitted questionnaires
                    $.ajax({
                        url: url + 'api/3/action/insert_quests',
                        type: 'POST',
                        data: formData_send,
                        contentType: false, // NEEDED
                        processData: false, // NEEDED
                        success: function (data) {
                            console.log("OK")
                        }
                    });

                }, 3000);
            });
        }
    };
});