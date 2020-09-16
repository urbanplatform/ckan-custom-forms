"use strict";

ckan.module('form_submit', function ($) {
    return {
        initialize: function () {
            // CKAN URL + API init
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";

            //CKAN API KEY of admin user
            var api_ckan_key = "";
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    api_ckan_key = data.result["admin_key"];
                },
                error: function (data) {
                    console.log(data);
                }
            });
            //Function to create Dataset with CKAN API
            function create_dataset_and_store_resource(dataset_name, organization_id, type_quest, final_json_to_send, tmp_obj) {
                //Create data form to send in the request
                var dataset_id = dataset_name.split(" ").join("-").toLowerCase();
                let json_data = {};
                json_data["title"] = dataset_name;
                json_data["name"] = dataset_id;
                json_data["owner_org"] = organization_id;
                json_data["private"] = "true";
                json_data["extras"] = [{ "key": "is_data_store", "value": "true" }];
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
                        create_and_insert_first_row_into_resource(dataset_id, type_quest, final_json_to_send, tmp_obj);
                    },
                    error: function (ts) {
                        console.log(ts.responseText);
                    }
                });
                return dataset_id;
            }

            //Function to insert table into resource and first row with Datastore API
            function create_and_insert_first_row_into_resource(dataset_name, resource_name, final_json_to_send, tmp_obj) {
                //Get types and consequent questions/answer keys
                var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }];
                tmp_obj.map((x => { fiels_resource.push({ "id": x }) }));
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
                            "format": "csv"
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

            //Function on clicking to save and close questionnaire
            $("#submitForm").click(function () {
                // Get the type of questionnaire string from the title
                var type_quest = $("#form-title").text().toLowerCase().split("-")[1].trim().split(" ").join("_")
                // Hide div with the final state's text of the questionnaire
                $("#finish_quest").css("display", "none");
                // Show loader
                $("#loader").css("display", "block");
                var overall_obj = [];
                let questions_entity = [];
                var tmp_obj = [];
                //Get all info from questionnaire
                $('#quest_content_form > div').each(function () {
                    var key = this.id;
                    var key_id = key.split("_")[0];
                    //let questions_entity = [];
                    // Get all checked values from questionnaire tables
                    $("#" + key + " #all_tables tbody tr").each(function () {
                        // Get id row
                        var key_opt = $(this).find('input[type="radio"]').attr("id");
                        tmp_obj.push(key_opt + "_question");
                        tmp_obj.push(key_opt + "_answer");
                        if ($(this).find('input[type="radio"]').is(":checked")) {
                            // Get question
                            var row_question = $(this).find('th').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var row_opt = $(this).find('input[type="radio"]:checked').attr("value");
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: row_opt });
                        }

                    });
                    $("#" + key + " #all_tables .input_text").each(function () {
                        // Get id row
                        var key_opt = $(this).find('textarea').attr("id");
                        tmp_obj.push(key_opt + "_question");
                        tmp_obj.push(key_opt + "_answer");
                        if ($(this).find('textarea').val() != "") {
                            // Get question
                            var row_question = $(this).find('label').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var row_opt = $(this).find('textarea').val();
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: row_opt });
                        }
                    });
                    // if (questions_entity.length > 0)
                    //     tmp_obj.push(questions_entity);

                    // overall_obj[key_id] = tmp_obj;
                });

                var resource_id = "";
                setTimeout(function () {
                    let dataset_name = "";
                    let organization_id = "";
                    let organization_name = "";
                    let dataset_exists = false;
                    let resource_exists = false;
                    let resource_to_use = "";

                    // Get all datasets from a specific user with his key
                    $.ajax({
                        url: url + 'api/3/action/current_package_list_with_resources',
                        type: 'GET',
                        headers: {
                            "Authorization": api_ckan_key
                        },
                        success: function (data) {
                            for (var i = 0; i < data.result.length; i++) {
                                //If organization wasnt associated already
                                if (organization_id == "") {
                                    if (data.result[i]["owner_org"] && data.result[i]["owner_org"] != "") {
                                        organization_id = data.result[i]["owner_org"];
                                        organization_name = data.result[i]["organization"]["name"]

                                    }
                                }
                                if (dataset_name == "") {
                                    if (data.result[i]["extras"].length > 0) {
                                        for (var u = 0; u < data.result[i]["extras"].length; u++) {
                                            if (data.result[i]["extras"][u]["key"] == "is_data_store") {
                                                dataset_name = data.result[i]["name"];
                                                break;
                                            }
                                        }
                                    }
                                }
                                // First check if dataset and his resource exists
                                if (data.result[i]["name"] == dataset_name) {
                                    dataset_exists = true;
                                    if (data.result[i]["resources"].length > 0) {
                                        for (var u = 0; u < data.result[i]["resources"].length; u++) {
                                            if (type_quest == data.result[i]["resources"][u]["name"]) {
                                                resource_exists = true;
                                                resource_id = data.result[i]["resources"][u]["id"];
                                                resource_to_use = data.result[i]["resources"][u]["name"];
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            //Final json structure to send to rabbit
                            var currentdate = new Date();
                            console.log(questions_entity[0]);
                            var final_json_to_send = { "id": type_quest, "info": type_quest + "_quest", "date_submitted": currentdate };
                            questions_entity.forEach(x => {
                                for (const [key, value] of Object.entries(x)) {
                                    final_json_to_send[key] = value
                                }
                            });
                            console.log(final_json_to_send);
                            //var final_json_to_send = { "id": type_quest, "info": type_quest + "_quest", "records": questions_entity, "date_submitted": currentdate };
                            // In case of data_store dataset doenst exists create them
                            if (!dataset_exists) {
                                //Create dataset
                                dataset_name = "Questionnaires Data from " + organization_name;
                                create_dataset_and_store_resource(dataset_name, organization_id, type_quest, final_json_to_send, tmp_obj);
                            }
                            else if (!resource_exists) {
                                //Create new resource and insert into it
                                create_and_insert_first_row_into_resource(dataset_name, type_quest, final_json_to_send, tmp_obj);
                            }
                            else {
                                //Insert into resource
                                insert_new_row_into_resource(resource_id, final_json_to_send);
                            }
                        },
                        error: function (data) {
                            console.log(data);
                        }
                    });
                    window.location.href = "/";
                }, 3000);
            });
        }
    };
});