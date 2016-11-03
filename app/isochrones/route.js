import Ember from 'ember';
import mapBboxRoute from 'mobility-playground/mixins/map-bbox-route';
import setLoading from 'mobility-playground/mixins/set-loading';
import polygon from 'npm:turf-polygon';
import difference from 'npm:turf-difference';


export default Ember.Route.extend(setLoading, {
	queryParams: {
    isochrone_mode: {
      replace: true,
      refreshModel: true,
    },
    pin: {
      replace: true,
      refreshModel: true
    }
  },
	setupController: function (controller, model) {
		if (controller.get('bbox') !== null){
			var coordinateArray = [];
			var bboxString = controller.get('bbox');
			var tempArray = [];
			var boundsArray = [];

			coordinateArray = bboxString.split(',');

			for (var i = 0; i < coordinateArray.length; i++){
				tempArray.push(parseFloat(coordinateArray[i]));
			}
		
			var arrayOne = [];
			var arrayTwo = [];
			arrayOne.push(tempArray[1]);
			arrayOne.push(tempArray[0]);
			arrayTwo.push(tempArray[3]);
			arrayTwo.push(tempArray[2]);
			boundsArray.push(arrayOne);
			boundsArray.push(arrayTwo);
			controller.set('leafletBounds', boundsArray);

		}
		controller.set('leafletBbox', controller.get('bbox'));
    this._super(controller, model);
		
	},
	model: function(params){
    this.store.unloadAll('data/transitland/operator');
    this.store.unloadAll('data/transitland/stop');
    this.store.unloadAll('data/transitland/route');
    this.store.unloadAll('data/transitland/route_stop_pattern');

    if (params.isochrone_mode){
	    var self = this;
	    var pinLocation = params.pin;			

	    if (typeof(pinLocation)==="string"){
	      var pinArray = pinLocation.split(',');
	      pinLocation = pinArray;
	    } 

	    var mode = params.isochrone_mode;
	    var url = 'https://matrix.mapzen.com/isochrone?api_key=matrix-bHS1xBE&json=';
	    var json = {
	      locations: [{"lat":pinLocation[0], "lon":pinLocation[1]}],
	      costing: mode,
	      costing_options: {"pedestrian":{"use_ferry":0}},
	      contours: [{"time":15},{"time":30},{"time":45},{"time":60}],
	    };
	    if (json.costing === "multimodal"){
	      json.denoise = .1;
	    }
	    url += escape(JSON.stringify(json));
	    return Ember.RSVP.hash({
	      url: url,
	      isochrones: Ember.$.ajax({ url }).then(function(response){
	        var features = response.features;
	        for(var k = 0; k < features.length; k++) {
	          //find the next set of contours
	          var i = k + 1;
	          while(i < features.length && features[i].properties.contour == features[k].properties.contour)
	            i++;
	          if(i >= features.length)
	          break;
	          //cut this one by all of these smaller contours
	          var outer = polygon(features[k].geometry.coordinates);
	          var contour = features[i].properties.contour;
	          while(i < features.length && contour == features[i].properties.contour) {
	            var inner = polygon(features[i].geometry.coordinates);
	            outer = difference(outer, inner);
	            i++;
	          }
	          //keep it
	          features[k].geometry = outer.geometry;
	        }
	        return response;
	      })
	    });
	  } 
    
  },
	actions: {
	}
});


  