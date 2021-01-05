import { OpenStreetMapProvider, RequestType } from "leaflet-geosearch";
const PROVIDER = new OpenStreetMapProvider({
  params: {
    "accept-language": "id",
    countrycodes: "id"
  }
});

function GeoSearch() {
  return {
    provider: PROVIDER,
    params: {city: null, county: null},
    setCity (text) {
      if (!text) return this
      this.params.city = text.toLowerCase()
      return this
    },
    setDistrict (text) {
      if (!text) return this
      this.params.county = text.toLowerCase()
      return this
    },
    getQuery (text) {
      let q = text
      if (this.params.city || this.params.county) {
        q += ','
        q += [this.params.city || undefined, this.params.county || undefined].join(', ')
      }
      return q
    },
    /*
    * Core
    * */
    search(query) {
      let q = this.getQuery(query)
      return this.provider.search({ query: q });
    },
    async reverse(lat, lng) {
      // return this.provider.search({ query: {lat: lat, lon: lng}, type: 1 })
      const url = this.provider.endpoint({query: {lat: lat, lon: lng}, type: 1});

      const request = await fetch(url);
      const json = await request.json();
      return this.provider.parse({ data: json });
    }
  };
}

export default GeoSearch;
