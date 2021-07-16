.. .. You should enable this project on travis-ci.org and coveralls.io to make
..    these badges work. The necessary Travis and Coverage config files have been
..    generated for you.

.. ..  image:: https://travis-ci.org/lsantos/ckanext-citiesQuest.svg?branch=master
.. ..    :target: https://travis-ci.org/lsantos/ckanext-citiesQuest

.. ..  image:: https://coveralls.io/repos/lsantos/ckanext-citiesQuest/badge.svg
.. ..  :target: https://coveralls.io/r/lsantos/ckanext-citiesQuest

.. ..  image:: https://pypip.in/download/ckanext-citiesQuest/badge.svg
.. ..  :target: https://pypi.python.org/pypi//ckanext-citiesQuest/
.. ..  :alt: Downloads

.. ..  image:: https://pypip.in/version/ckanext-citiesQuest/badge.svg
.. ..  :target: https://pypi.python.org/pypi/ckanext-citiesQuest/
.. ..  :alt: Latest Version

.. ..  image:: https://pypip.in/py_versions/ckanext-citiesQuest/badge.svg
.. ..    :target: https://pypi.python.org/pypi/ckanext-citiesQuest/
.. ..    :alt: Supported Python versions

.. ..  image:: https://pypip.in/status/ckanext-citiesQuest/badge.svg
.. ..    :target: https://pypi.python.org/pypi/ckanext-citiesQuest/
.. ..    :alt: Development Status

.. ..  image:: https://pypip.in/license/ckanext-citiesQuest/badge.svg
.. ..    :target: https://pypi.python.org/pypi/ckanext-citiesQuest/
.. ..    :alt: License

==============
ckanext-citiesQuest
==============

citiesQuest is the first version of an objective, efficient and usable CKAN extension, 
whose primary goal is to allow users to create and fill one or more questionnaires. 
Its ultimate purpose is to evaluate information and collect more concise and precise 
results about all the stakeholders' experience and end-users’ data. Due to CKAN's default 
structure, the platform easily integrates with the extension.

For instance, a registered user creates a specific organisation and then adds several datasets to this organisation. 
With this extension, each dataset created has a particular purpose (e.g. processing a survey template for questionnaire 
rendering, storing questionnaire responses or storing users’ background information), and tasks for the correct providing 
and collection of information in a secure way.

The questionnaires have to be uploaded into a specific dataset of the platform, as we will explain further. 
Their data came from JSON files that were generated on an external website that handles standard survey generation 
for the web (https://surveyjs.io/Examples/Survey-Creator). Our extension is responsible for reading and taking all 
that data as well as rendering structured and organised questionnaires. 

In short, using extras pair of key/values in the creation of new datasets, it is possible to
define each dataset for a specific purpose.
For now, we have three types of keys:

- **is_data_store**: has the purpose of defining a dataset as a datastore to the questionnaires’ responses;

- **is_patient_store**: has the purpose of defining a dataset as a datastore to the uploaded patients files;

- **is_templating**:has the purpose of defining a dataset as a survey datastore.

*Note: when creating new datasets, add the key into 'Custom Field' input. 
You can only use one for each dataset.*

**is_data_store**

Datasets with this extra field will store data gathered from filling the questionnaires that were provided. 
Each questionnaire response is associated with a record and can be visualized by entering the resource and 
searching by id, username, questions or answers. All the resources can be automatically created, depending 
on the name of the questionnaire that it is associated with. In the following image, it is possible to see 
an example of a record and all the data recorded.

*Note: all questions and consequent responses are stored*

.. image:: ckanext/citiesQuest/public/data_store.jpg
    :width: 400 px
    :alt: Record from *is_data_store* dataset

**is_patient_store**

With this key, a dataset is defined as a store to upload files with information from 
patients. For now, we only test one example (SKBA example file) and, although the data 
visualization is incorrect (rows and columns do not match), the information is well 
recognized. 

It is important to refer that this dataset can only create one resource per patient. 

**is_templating**

In order to allow CKAN to list questionnaires, a new dataset must be created with this extra field. 
Consequently, the resources within this type of datasets are associated with the questionnaires’ rendering.

For instance, if a user wants to add a new questionnaire for a certain community, it is mandatory to create 
a new resource in a dataset for 'templating'. 
Only then, a JSON file with the structure of the questionnaire can be uploaded to that resource (to be processed by the extension).

The follow image presents an example of a structure associated with a resource of this type of dataset.

*Note: You can choose which datasets are private or public to the organization or all platform.*

.. image:: ckanext/citiesQuest/public/quests.jpg
    :width: 400 px
    :alt: Record from *is_templating* dataset

--------------------
Create Questionnaire
--------------------

The data from the JSON files that are uploaded to CKAN for questionnaire rendering is generated 
in an external website. To facilitate the perception and understanding of this process, 
we will explain, step by step, what must be done.

**SurveyJS** is an online visual survey creator and form builder that offers exactly what we want.

This is a critical part of the process. 
he structure used in the website is what the extension will try to understand to be able to render 
it in an efficient and organized way. So, we define a default structure, where some pages and corresponding 
properties are mandatory to avoid malformed questionnaires.

1. Go to https://surveyjs.io/Examples/Survey-Creator#content-result and, using the survey design, you can start creating the questionnaire.

2. Change the page properties to create and introduction page (title, name, description).

3. Create the right components to the introduction page (*Component* objects).

4. Add new pages to fill them with questions.

5. All the questions must be inside a *Panel* object. After insert one or several *Panels* there is two types of questions that our extension accepts:

     * radiogroup: To add it into the questionnaire, simply choose the tool ‘RadioGroup’ and click or drag into the panel. It is possible to change the order of the questions by dragging them up and down. Having the object in the survey design and inside a panel, click on it and go to ‘Properties’. There you can define the default fields of a question (here the ‘Description’ field is ignored) and then you can define if it is required or not. By activating the field ‘Is required’ our extension will assume the obligation and the user will have to answer it. Having the question text, we need to configure the possible answers. For that, we need to go to ‘Choices’,a dropdown button in the ‘Properties’ area. It contains the default key/values generated by the website and they are the fields that we must change. It is possible to erase and add options, and change their values. For a correct definition of each option, the following steps must be followed:

          * change the ‘Text’ input to the value that will appear in the question as possible options;
          
          * change the ‘Value’ input with a snake case style (p.e not_at_all ). Basically, it is the same as the ‘Text’ input but converted into a snake case.

     * single input: It is the classic type of questions where the user needs to write his own answer. To add it, choose the tool ‘Single input’ (it is also possible to order it). The rules are the same as for the radiogroup questions but in this case, there are no choices and it is possible to write a placeholder.

6. Finishing the questionnaire pages and having prepared the introduction page as well, the questionnaire is complete. Now we need to be able to access the raw data and then export it. For that, SurveyJS provides a JSON Editor. It is a tab that enables the visualization of questionnaire raw data. It provides the information in JSON format. To be able to export this data, this tab has several buttons with different actions. By clicking on the ‘Copy’ button, all the data is copied.

7. Once all the necessary data has been copied from the JSON Editor, the next step is to save it in a local file. To do it, use a text editor. Open a new file,  paste all the data and then save it as a JSON file. It is mandatory that the file is saved in JSON format (p.e patients.json).

8. It is just necessary to create a new resource in a templating dataset and upload the JSON file to CKAN.

9. In CKAN, we provide an example JSON file that contains SurveyJS generated data and that can be imported into the website and then changed to the creators’ requirements.

--------------------
Submit Questionnaire
--------------------

Having questionnaires already in the platform, ‘citiesQuest’ has the permissions to list all of them in the main page. Since each organization can have several templating datasets, each one is labelled with the name of the organization followed by the title of the dataset.
In the image below, we can see part of the questionnaires as well as the overall information associated with them.

.. image:: ckanext/citiesQuest/public/manual_end.png
    :width: 400 px
    :alt: Record from *is_templating* dataset

---------------
Important rules
---------------

The following points are the rules and features that need to be followed for our extension to work efficiently:
* To create an organisation, you need to be a registered user;

* We use Keycloak as an external server for the authentication process, so every user has to be registered there and the login is done in it as well;

* Only admin and editors’ users  can create new datasets and resources;

* If a templating dataset is public, users from all organisations and non-registered users can visualise it and answer it as well;

* If a templating dataset is private, only members from that organisation can have access to the questionnaires in the dataset. It is possible to add specific members as well by writing  the username on the ‘Add Member’ page;

* Datasets that store questionnaires’ responses (is_data_store) are automatically created;

* Questionnaires that do not respect the default rules will return error messages to the final user. In that case, export the JSON data to SurveyJS and review it;

* If a user does not answer all the required questions, an alert will be displayed;

* Try to give simple identifiers/names to the questionnaires’ files to get cleaner and more objective words in the questionnaires list.


============
Requirements
============

This extension was tested and can be executed for version 2.8 of CKAN. Any other
version wasn't tested so its not completly safe to use it in others versions.


============
Installation
============

- To install ckanext-citiesQuest in a set of Docker images and configuration files to run a CKAN site (https://github.com/okfn/docker-ckan):

     1. Go to Dockerfile in ckan folder ``/ckan/Dockerfile`` and add::

          RUN pip install -e git+https://gitlab.ubiwhere.com/smart-cities-h2020/tenderhealth/ckan-custom-forms.git@master#egg=ckanext-citiesQuest

     2. Add the plugin ``citiesQuest`` to the ``ckan.plugins`` setting in your CKAN config file

     3. Run or Restart CKAN container::

          docker container start/restart <name_of_ckan_container>

- To install ckanext-citiesQuest on local CKAN project:

     1. Activate your CKAN virtual environment, for example::

          . /usr/lib/ckan/default/bin/activate

     2. Install the ckanext-citiesQuest Python package into your virtual environment::

          pip install ckanext-citiesQuest

     3. Add ``citiesQuest`` to the ``ckan.plugins`` setting in your CKAN config file (by default the config file is located at ``/etc/ckan/default/production.ini``).

     4. Restart CKAN. For example if you've deployed CKAN with Apache on Ubuntu::

          sudo service apache2 reload


========================
Development Installation
========================

To install ckanext-citiesQuest for development, activate your CKAN virtualenv and
do::

    git clone https://github.com/lsantos/ckanext-citiesQuest.git
    cd ckanext-citiesQuest
    python setup.py develop
    pip install -r dev-requirements.txt


.. -----------------
.. Running the Tests
.. -----------------

.. To run the tests, do::

..     nosetests --nologcapture --with-pylons=test.ini

.. To run the tests and produce a coverage report, first make sure you have
.. coverage installed in your virtualenv (``pip install coverage``) then run::

..     nosetests --nologcapture --with-pylons=test.ini --with-coverage --cover-package=ckanext.citiesQuest --cover-inclusive --cover-erase --cover-tests


.. ---------------------------------
.. Registering ckanext-citiesQuest on PyPI
.. ---------------------------------

.. ckanext-citiesQuest should be availabe on PyPI as
.. https://pypi.python.org/pypi/ckanext-citiesQuest. If that link doesn't work, then
.. you can register the project on PyPI for the first time by following these
.. steps:

.. 1. Create a source distribution of the project::

..      python setup.py sdist

.. 2. Register the project::

..      python setup.py register

.. 3. Upload the source distribution to PyPI::

..      python setup.py sdist upload

.. 4. Tag the first release of the project on GitHub with the version number from
..    the ``setup.py`` file. For example if the version number in ``setup.py`` is
..    0.0.1 then do::

..        git tag 0.0.1
..        git push --tags


.. ----------------------------------------
.. Releasing a New Version of ckanext-citiesQuest
.. ----------------------------------------

.. ckanext-citiesQuest is availabe on PyPI as https://pypi.python.org/pypi/ckanext-citiesQuest.
.. To publish a new version to PyPI follow these steps:

.. 1. Update the version number in the ``setup.py`` file.
..    See `PEP 440 <http://legacy.python.org/dev/peps/pep-0440/#public-version-identifiers>`_
..    for how to choose version numbers.

.. 2. Create a source distribution of the new version::

..      python setup.py sdist

.. 3. Upload the source distribution to PyPI::

..      python setup.py sdist upload

.. 4. Tag the new release of the project on GitHub with the version number from
..    the ``setup.py`` file. For example if the version number in ``setup.py`` is
..    0.0.2 then do::

..        git tag 0.0.2
..        git push --tags
