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

            // Global vars
            var is_file_data = false;
            var dataset_files_id = "";
            // Ajax request (GET) to get apikey from the logged user
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    if ((data.result) && (data.result.hasOwnProperty("user_logged"))) {
                        api_ckan_key = data.result["user_logged"]["apikey"];
                        username = data.result["user_logged"]["name"]
                    }
                },
                error: function (data) {
                    console.log(data);
                }
            });

            //Function to create Dataset with CKAN API
            function create_dataset_and_store_resource(dataset_name, organization_id, data_to_store) {
                //Create data form to send in the request
                var dataset_id = dataset_name.split(" ").join("-").toLowerCase();
                let json_data = {};
                json_data["title"] = dataset_name;
                json_data["name"] = dataset_id;
                json_data["owner_org"] = organization_id;
                json_data["private"] = "true";
                json_data["extras"] = [{ "key": "is_file_data", "value": "true" }];
                //ajax request to create dataset
                $.ajax({
                    url: url + 'api/3/action/package_create', // create dataset path
                    type: 'POST',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    data: JSON.stringify(json_data),
                    dataType: "json",
                    contentType: 'application/json; charset=utf-8',
                    success: function (data) {
                        console.log(data.result);
                        //Create new resource and insert into it
                        var new_urls = create_resource_in_dataset(dataset_id, data_to_store);
                        return new_urls;
                    },
                    error: function (ts) {
                        console.log(ts.responseText);
                    }
                });
                return dataset_id;
            }

            //Function to insert resources in dataset
            function create_resource_in_dataset(dataset_id, data_to_store) {
                //Verify if data is a list to insert one at a time
                var urls = [];
                if (Array.isArray(data_to_store)) {
                    for (var i = 0; i < data_to_store.length; i++) {
                        // Ajax request to create a resource
                        $.ajax({
                            url: url + 'api/3/action/resource_create', //insert row in resource path
                            type: 'POST',
                            headers: {
                                "Authorization": api_ckan_key
                            },
                            data: JSON.stringify({
                                "package_id": dataset_id,
                                "name": data_to_store[i]["name"],
                            }),
                            files: [('upload', data_to_store[i])],
                            success: function (data) {
                                console.log(data.result);
                                urls.append(data.result["url"]);
                            },
                            error: function (data) {
                                console.log(data);
                            }
                        });
                    }
                    return urls
                }
            }

            //Function to insert table into resource and first row with Datastore API
            ////Not used but kept it for future work
            function create_and_insert_first_row_into_resource(dataset_name, resource_name, final_json_to_send, list_with_all_questions_and_answers_ids, is_first = false) {
                //Get types and consequent questions/answer keys
                var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }];
                list_with_all_questions_and_answers_ids.map((x => {
                    fiels_resource.push({ "id": x });
                    if (is_first == true)
                        if (!final_json_to_send.hasOwnProperty(x)) {
                            final_json_to_send[x] = "";
                        }

                }));
                //ajax request to create resource
                $.ajax({
                    url: url + 'api/3/action/datastore_create', // create resource path
                    type: 'POST',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    data: JSON.stringify({
                        "resource": {
                            "package_id": dataset_name,
                            "name": resource_name,
                            "format": "json"
                        },
                        "force": true,
                        "fields": fiels_resource,
                        "records": [final_json_to_send]
                    }),
                    success: function (data) {
                        console.log('ok');
                        console.log(data.result);
                    },
                    error: function (ts) {
                        console.log(ts.responseText);
                    }
                });
            }

            //Function to insert data row into resource with Datastore API
            //Not used but kept it for future work
            function insert_new_row_into_resource(resource_id, final_json_to_send) {
                //ajax request to insert data row into resource
                console.log(final_json_to_send["records"]);
                $.ajax({
                    url: url + 'api/3/action/datastore_upsert', //insert row in resource path
                    type: 'POST',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    data: JSON.stringify({
                        "resource_id": resource_id,
                        "force": true,
                        "method": "insert",
                        "records": [final_json_to_send]
                    }),
                    success: function (data) {
                        console.log(data.result);
                    },
                    error: function (data) {
                        console.log(data);
                    }
                });
            }

            //Function to create or update a datastore thats responsible for storing all the files uploaded from questionnaires
            function generate_or_update_file_storing_dataset(files) {
                //Verify if dataset exists
                var urls_to_add = [];
                //Ajax request (GET) to get all datasets and consequent resources that the logged user has access
                $.ajax({
                    url: url + 'api/3/action/current_package_list_with_resources',
                    type: 'GET',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    success: function (data) {
                        data.result.forEach(function (dataset) {
                            // In case of this dataset has extras for templating, display the resources as questionnaires
                            if (("extras" in dataset) && (dataset["extras"].length > 0)) {
                                dataset.extras.forEach(function (extra) {
                                    if ((extra["key"].trim() == "is_file_data" && extra["value"].trim() == "true")) {
                                        is_file_data = true;
                                        dataset_files_id = dataset.id;
                                    }
                                });
                                console.log(files[0]["name"]);
                                if (is_file_data) {
                                    // Update dataset by inserting a new resource
                                    urls_to_add = create_resource_in_dataset(dataset_files_id, files);
                                }
                                else {
                                    // Create dataset and insert resource
                                    urls_to_add = create_dataset_and_store_resource("Questionnaires File Storage", organization_id, files);
                                }
                                return urls_to_add;
                            }
                        });
                    },
                    error: function (data) {
                        console.log(data);
                    }
                });
            }

            //Function on clicking to submit, save and close questionnaire
            $("#submitForm").click(function () {
                // Get the type of questionnaire string from the title
                var type_quest = $("#form-title").text().toLowerCase().split("-")[1].trim().split(" ").join("_")
                // Object to store files uploaded
                var files = [];
                var formData_send = new FormData();
                // Hide div with the final state's text of the questionnaire
                $("#finish_quest").css("display", "none");
                // Show loader
                $("#loader").css("display", "block");
                let questions_entity = [];
                var list_with_all_questions_and_answers_ids = [];
                //Get all info from questionnaire
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
                            // Ajax request (POST) to call custom request to store files uploaded
                            $.ajax({
                                async: false,
                                url: url + 'api/3/action/create_dataset_files_resource',
                                type: 'POST',
                                data: form_file_data,
                                contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
                                processData: false, // NEEDED, DON'T OMIT THIS
                                success: function (data) {
                                    //var url_answer = JSON.stringify(data.result["urls"]);
                                    // Define data structure of questions/answers
                                    questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: data.result["urls"] });
                                }
                            });

                        }
                    });

                    // For geo location. Here is stored the pointfield
                    // $("#" + key + " #all_tables .input_location").each(function () {
                    //     // Get id row
                    //     var key_opt = $(this).attr("id");
                    //     list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                    //     list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                    //     if ($(this).find('textarea').val() != "") {
                    //         // Get question
                    //         var row_question = $(this).find('label').text().replace('\t', '').replace('*', '');
                    //         // Get answer
                    //         var answer_location_arr = unescape(encodeURIComponent($(this).find('textarea').val())); //.split("<br>");
                    //         // var final_answer_location = { "longitude": parseFloat(answer_location_arr[0].split(" ")[1]), "latitude": parseFloat(answer_location_arr[1].split(" ")[1]) }
                    //         // Define data structure of questions/answers
                    //         questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: answer_location_arr });// JSON.stringify(final_answer_location) });
                    //     }

                    // });
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
                    var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }, { "id": "username" }];
                    // Auxiliar boolean to be able to insert the questions and answer that were answered
                    let it_has_answer = false;

                    list_with_all_questions_and_answers_ids.map((x => {
                        fiels_resource.push({ "id": x });
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
                    //var formData_send = new FormData();
                    formData_send.append("name_resource", type_quest);
                    formData_send.append("organization_id", organization_id);
                    formData_send.append("result", JSON.stringify(final_json_to_send));
                    // Ajax request (POST) to call custom request to create and/or insert submitted questionnaires
                    $.ajax({
                        url: url + 'api/3/action/insert_quests',
                        type: 'POST',
                        data: formData_send,
                        contentType: false, // NEEDED
                        processData: false, // NEEDED
                        //data: JSON.stringify({ "name_resource": type_quest, "organization_id": organization_id, "result": JSON.stringify(final_json_to_send) }),
                        //dataType: "json",
                        //contentType: "application/json; charset=utf-8",
                        success: function (data) {
                            console.log(data);
                            window.location.href = "/";
                        }
                    });

                }, 3000);
            });
        }
    };
});