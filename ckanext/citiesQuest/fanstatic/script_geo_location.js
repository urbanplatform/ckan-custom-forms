/*
Depending on the type of the location data platform, this file is a helper 
to define and render the questions that are associated with geo location. 
*/
// Type of request (nominatim or mapbox)
var type_request = "";
//URL 
var geo_url = "";
//KEY
var geo_key = "";
//STYLE
var geo_style = "mapbox://styles/mapbox/streets-v11";

/**
 * This function is responsible for listing the options by giving
 * the coordinates
 * @param  {[string]} type_request name of the geo platform (ex. mapbox)
 * @param  {[string]} coords coordinates (latitude and longitude)
*/
function is_gen_geo_location(type, map_key, url) {
    let valid_key = true;
    // If all variables exists and arent null
    if (type && url && map_key) {
        type_request = type;
        geo_key = map_key;
        geo_url = url;
    }
    else {
        console.log("Mandatory values are invalid or arent available!");
        valid_key = false;
        return valid_key;
    }

    // Define access token
    mapboxgl.accessToken = geo_key;
    navigator.geolocation.getCurrentPosition(position => {
        var map = new mapboxgl.Map({
            container: 'map', // container id
            style: geo_style, // style URL
            center: [position.coords.longitude, position.coords.latitude], // starting position [lng, lat]
            zoom: 14 // starting zoom
        });
        var marker = new mapboxgl.Marker({
            draggable: true,
            color: "rgba(201,233,243,0.5)"
        })
            .setLngLat([position.coords.longitude, position.coords.latitude])
            .addTo(map);

        // On finish draging
        function onDragEnd() {
            var lngLat = marker.getLngLat();
            request_options_choose(type_request, lngLat);
        }

        /**
         * This function is responsible for listing the options by giving
         * the coordinates
         * @param  {[string]} type_request name of the geo platform (ex. mapbox)
         * @param  {[string]} coords coordinates (latitude and longitude)
        */
        function request_options_choose(type_request, coords) {
            if (type_request == "nominatim") {
                var url_request = geo_url + 'reverse?format=json&lat=' + coords.lat + '&lon=' + coords.lng;
            }
            // Mapbox
            else {
                var url_request = geo_url + coords.lng + ',' + coords.lat + '.json?types=address&access_token=' + geo_key;
            }
            var coord_values = "";
            $.ajax({
                url: url_request,
                type: 'GET',
                success: function (data) {
                    console.log(data);
                    group_spots.style.display = 'block';
                    list_spots.style.display = 'block';
                    list_spots.innerHTML = '';
                    var margin_bot = "16px";
                    var selected_address_color = "";
                    if ((!data.hasOwnProperty('error') && type_request == "nominatim") || (type_request == "mapbox" && data["features"].length == 1)) {
                        if (type_request == "nominatim") {
                            var value_map = data["display_name"];
                            coord_values = data["lat"] + "," + data["lon"];
                        }
                        else {
                            var value_map = data["features"][0]["place_name"];
                            coord_values = data["features"][0]["geometry"]["coordinates"][0] + "," + data["features"][0]["geometry"]["coordinates"][1];
                            console.log(coord_values);
                        }

                        margin_bot = "0px";

                        if (value_map == $("#name_place").val()) {
                            selected_address_color = "#005d7a";
                            list_spots.innerHTML += '<button type="button" disabled style="color:white;background-color:' + selected_address_color + '; margin-bottom: ' + margin_bot + ';" class="btn_opts">' + value_map + '</button>';
                        }
                        else if (value_map)
                            list_spots.innerHTML += '<button type="button" style="margin-bottom: ' + margin_bot + ';" class="btn_opts">' + value_map + '</button>';
                    }
                    else {
                        list_spots.innerHTML = '<p style="margin-bottom:0px;" class="btn_opts_none">No options available. Please choose another</p>';
                    }
                },
                complete: function (data) {
                    $(".btn_opts").click(function () {
                        name_place.style.display = 'block';
                        name_place.style.backgroundColor = '#005d7a';
                        name_place.style.color = 'white';
                        if (coord_values) {
                            $("#coords_place").text(coord_values);
                        }
                        $("#name_place").val($(this)[0].innerText);
                        group_spots.style.display = 'none';
                        list_spots.innerHTML = '';
                        list_spots.style.display = 'none';
                    });
                }
            });
        }

        // Add geolocate control to the map.
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            })
        );

        // On dragging the marker, in the end the following function is executed
        marker.on('dragend', onDragEnd);
        map.on('click', function (e) {
            marker.setLngLat([e.lngLat.wrap().lng, e.lngLat.wrap().lat]);
            request_options_choose(type_request, e.lngLat.wrap());
        });

        // On clicking in search button
        $("#search_map .btn-default").click(function () {
            var query = $("#search_map input").val();
            $("#search_map input").val('');
            var results = [];
            if (type_request == "nominatim") {
                var url_request = geo_url + 'search/' + encodeURIComponent(query.toLowerCase()) + '?format=json&limit=5&addressdetails=1'
            }
            // Mapbox
            else {
                var url_request = geo_url + encodeURIComponent(query.toLowerCase()) + '.json?types=address&access_token=' + geo_key;
            }
            // AJAX GET request to get the results from the search
            $.ajax({
                url: url_request,
                type: 'GET',
                success: function (data) {
                    if (type_request == "nominatim") {
                        for (i = 0; i < data.length; i++)
                            results.push(data[i].display_name);
                    }
                    else {
                        for (i = 0; i < data["features"].length; i++)
                            results.push(data["features"][i].place_name);
                    }
                },
                complete: function () {
                    var margin_bot = "16px";
                    // If there is results, list them
                    if (results.length > 0) {
                        group_spots.style.display = 'block';
                        list_spots.style.display = 'block';
                        list_spots.innerHTML = '';
                        for (var i = 0; i < results.length; i++) {
                            if ((i + 1) == results.length)
                                margin_bot = "0px";

                            if (results[i] == $("#name_place").val()) {
                                selected_address_color = "#005d7a";
                                list_spots.innerHTML += '<button type="button" disabled style="color:white;background-color:' + selected_address_color + '; margin-bottom: ' + margin_bot + ';" class="btn_opts">' + results[i] + '</button>';
                            }
                            else if (results[i])
                                list_spots.innerHTML += '<button type="button" style="margin-bottom: ' + margin_bot + ';" class="btn_opts">' + results[i] + '</button>';
                        }
                    }
                    else {
                        list_spots.innerHTML = '<p style="margin-bottom:0px;" class="btn_opts_none">No options available. Please choose another</p>';
                    }
                    // On clicking in one of the options listed
                    $(".btn_opts").click(function () {
                        name_place.style.display = 'block';
                        name_place.style.backgroundColor = '#005d7a';
                        name_place.style.color = 'white';
                        $("#name_place").val($(this)[0].innerText);
                        group_spots.style.display = 'none';
                        list_spots.innerHTML = '';
                        list_spots.style.display = 'none';
                    });
                }
            });
        })
    });
    return valid_key
}
