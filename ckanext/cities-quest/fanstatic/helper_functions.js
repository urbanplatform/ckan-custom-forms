/*
This file contains unused function that could be added in
new features. Its a store functions file
*/

// Global vars
var is_file_data = false;
var dataset_files_id = "";

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

//Function to insert table into resource and first row with Datastore API
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