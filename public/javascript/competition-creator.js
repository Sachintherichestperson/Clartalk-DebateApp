function initAutocomplete() {
      var input = document.getElementById("location-input");
      var autocomplete = new google.maps.places.Autocomplete(input);
      
      autocomplete.addListener("place_changed", function () {
          var place = autocomplete.getPlace();
          console.log("Selected Place:", place);
      });
  }

google.maps.event.addDomListener(window, "load", initAutocomplete);
