"""This file is responsible for all the extra requests made to server side.
It is possible to create new endpoints and implement different plugins,
depending on the purpose of this extension.
"""

# CKAN imports
import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
import ckan.lib.base as base

# Flask import
from flask import Blueprint, request

# Converters imports
import ast
import json

# Collection import (order)
from collections import OrderedDict


# Blueprint
questionnaire = Blueprint("questionnaire", __name__)

# Render html page on ckan
render = base.render


# Method to be able to render questionnaires on ckan
@questionnaire.route("/questionnaire", endpoint="custom_action")
def custom_action():
    """Method to enable questionnaires render.
    It receives three arguments (resource-id; dataset-id; type_quest)
    that allow us to submit and store any questionnaire successfully

    Returns:
        toolkit.render: It returns an html page with the needed
        variables
    """
    organization = request.args.get("organization", type=str)
    resource_id = request.args.get("resource-id", type=str)
    dataset_id = request.args.get("dataset-id", type=str)
    type_quest = request.args.get("type_quest", type=str)
    return toolkit.render(
        "home/questionnaires.html",
        extra_vars={
            "organization": organization,
            "resource-id": resource_id,
            "dataset-id": dataset_id,
            "type_quest": type_quest,
        },
    )


@toolkit.side_effect_free
def get_key(context, data_dict=None):
    """Method to get the apikey from logged user

    Arguments:
        context (dict): contains several objects: user logged,
        session, apikey, api version and model

        data_dict (dict): contains all the data sended in the
        request

    Returns:
        toolkit.render: It returns an html page with the needed
        variables
    """
    users = toolkit.get_action("user_list")(data_dict={})
    for user in users:
        user_id = user["id"]
        user_logged = toolkit.get_action("user_show")(data_dict={"id": user_id})
        if "apikey" in user_logged:
            return {"user_logged": user_logged}


# @toolkit.side_effect_free
def insert_quests(context, data_dict=None):
    """Method to enable members to submit questionnaires and add them into a
    specific resource.
    By getting the dataset creator id, we are able to do a temporary login and
    get the apikey.
    With it, we can do datastore_update with success and store the response
    from any user.
    In case of the organization associated with the questionnaire doesnt had
    dataset to store the data, its created automatically

    Arguments:
        context (dict): contains several objects: user logged,
        session, apikey, api version and model

        data_dict (dict): contains all the data sended in the
        request

    Returns:
        datastore (object) : It returns an object depending on the existence
        of the a specific resource or not. If the resource exists, it returns
        the modified data object, otherwise it returns the newly created data object
    """
    # Get the name of the resource and organization
    name_resource = data_dict.pop("name_resource", None)
    organization_id = data_dict.pop("organization_id", None)

    # Initialize variable to have direct access to dabatase
    # Its used to do read requests only
    model = context["model"]
    if organization_id:
        # check if organization has dataset to store data
        dataset_in = (
            model.Session.query(model.Package)
            .join(model.PackageExtra)
            .filter(model.Package.state == "active")
            .filter(model.Package.owner_org == organization_id)
            .filter(model.PackageExtra.key == "is_data_store")
            .first()
        )
        new_dataset = None
        if not dataset_in:
            data_dataset = {
                "title": "Questionnaires Data Submitted",
                "name": "questionnaires-data-submitted-" + organization_id + "",
                "owner_org": organization_id,
                "private": "true",
                "extras": [{"key": "is_data_store", "value": "true"}],
            }
            new_dataset = toolkit.get_action("package_create")(
                context={"ignore_auth": "true"}, data_dict=data_dataset,
            )
            print("Create Dataset")

    else:
        return {
            "success": False,
            "msg": "Organization name is invalid.",
        }

    if name_resource:
        # Get the resource of the questionnaire submmitted
        resource = (
            model.Session.query(model.Resource)
            .join(model.Package)
            .filter(model.Resource.name == name_resource)
            .filter(model.Resource.state == "active")
            .filter(model.Package.state == "active")
            .first()
        )
        # Convert the data received into a dictionary
        result = ast.literal_eval(json.dumps(data_dict["result"]))
        # Order the dictionary in two phases : by the last word in the in the
        # key string (reverse); by the first word in the key string joined
        # with the number in the key string (in case of neither of this
        # conditions matches, it orders by all key string)
        ordered_result = OrderedDict(
            sorted(
                sorted(
                    ast.literal_eval(result).items(),
                    key=lambda s: (
                        s[0].split("_")[-1]
                        if "_" in s[0] and len(s[0].split("_")) > 2
                        else s[0]
                    ),
                    reverse=True,
                ),
                key=lambda s: (
                    (
                        s[0].split("_")[0]
                        if "_" in s[0] and len(s[0].split("_")) > 2
                        else s[0]
                    ),
                    (
                        int(s[0].split("_")[-2])
                        if "_" in s[0] and len(s[0].split("_")) > 2
                        else s[0]
                    ),
                ),
            ),
        )
        # If resource exists update it with the new submitted questionnaire
        if resource:
            data_to_send = {
                "resource_id": resource.id.encode("utf-8"),
                "force": "true",
                "method": "insert",
                "records": [ordered_result],
            }
            insert_quest = toolkit.get_action("datastore_upsert")(
                context={"ignore_auth": "true"}, data_dict=data_to_send,
            )

            return insert_quest
        else:
            if new_dataset:
                dataset = new_dataset
                name_package = dataset["name"]
            else:
                # Get dataset responsible for storing quesitonnaires
                dataset = (
                    model.Session.query(model.Package)
                    .join(model.PackageExtra)
                    .filter(model.Package.state == "active")
                    .filter(model.PackageExtra.key == "is_data_store")
                    .filter(model.Package.owner_org == organization_id)
                    .first()
                )
                name_package = dataset.name

            # Create resource and insert the submitted questionnaire on it
            if dataset:
                data_to_send = {
                    "resource": {
                        "package_id": name_package,
                        "name": name_resource,
                        "format": "json",
                    },
                    "force": "true",
                    "method": "insert",
                    "records": [ordered_result],
                }
                create_resource_and_insert_quest = toolkit.get_action(
                    "datastore_create"
                )(context={"ignore_auth": "true"}, data_dict=data_to_send,)

                return create_resource_and_insert_quest
            else:
                return {
                    "success": False,
                    "msg": "Dataset name is invalid.",
                }
    else:
        return {
            "success": False,
            "msg": "Resource name is invalid.",
        }


@toolkit.side_effect_free
def get_user_role(context, data_dict=None):
    """This method it was created to get the role of the logged user.

    Args:
        context (dict): contains several objects: user logged,
        session, apikey, api version and model

        data_dict (dict): contains all the data sended in the
        request

    Returns:
        user_role (object): logged user role. It retunes 'none' in case of a 
        non registered user.
    """
    # Get the id of the logged user
    dataset_id = data_dict.pop("dataset_id", "")
    user = context["auth_user_obj"]

    if not user.id:
        return {"user_role": "none"}

    user_logged_org = toolkit.get_action("organization_list_for_user")(
        data_dict={"id": user.id}
    )

    # Initialize variable to have direct access to dabatase
    # Its used to do read requests only
    model = context["model"]

    if user_logged_org and dataset_id:
        organization_quest = (
            model.Session.query(model.Package)
            .filter(model.Package.id == dataset_id)
            .first()
        )
        for org in user_logged_org:
            if org["id"] == organization_quest.owner_org:
                role = org["capacity"]
                return {"user_role": role}

        return {"user_role": "none"}


class Ext_V1Plugin(plugins.SingletonPlugin, toolkit.DefaultDatasetForm):
    """Class that inherits from CKANs SingletonPlugin and DefaultDatasetForm.
    Here we can configure which plugins we want to implement, the resources and
    directories to use and create new requests, blueprints, etc.
    """

    # All the plugins implemented
    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IBlueprint)
    plugins.implements(plugins.interfaces.IActions)

    def update_config(self, config_):
        """Called by load_environment at the earliest
        point that config is available to plugins.
        The config should be updated in place.
        Define which directories will be used
        to store all the files needed to this extension
        """
        toolkit.add_template_directory(config_, "templates")
        toolkit.add_public_directory(config_, "public")
        toolkit.add_resource("fanstatic", "ext_v1")

    def get_blueprint(self):
        """Register an extension as a Flask Blueprint.

        Returns:
            Return either a single Flask Blueprint
            object or a list of Flask Blueprint objects
            to be registered by the app.
        """
        return questionnaire

    def get_actions(self):
        """Create new actions/requests

        Returns:
            Should return a dict, the keys being the name
            of the logic function and the values being the
            functions themselves.
        """
        return {
            "get_key": get_key,
            "insert_quests": insert_quests,
            "get_user_role": get_user_role,
        }

