<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      align-items: stretch;
      height: 98vh;
      width: 100%;
    "
  >
    <div class="info-box">
      <div class="search-box">
        <form>
          <v-select
            @search="fetchAddress"
            :options="state.searchlist"
            @input="setAddress"
            placeholder="Cari di daerah ..."
          >
            <div
              slot="option"
              slot-scope="item"
              style="font-size: 10px; white-space: normal"
            >
              {{ item.label }}
            </div>
          </v-select>
        </form>
      </div>
      <div class="item-box">
        <label>Batas Data dalam Grid</label>
        <span
          >{{ state.info.ranges[0] || "#" }} -
          {{ state.info.ranges[1] || "#" }}</span
        >
      </div>
      <div class="item-box">
        <label>Total Data</label>
        <span
          >{{ state.info.point_count || "#" }} [{{
            state.info.group_count || "#"
          }}]</span
        >
      </div>
      <div class="item-box">
        <label>Status Data</label>
        <span
          ><a style="color: maroon" href="#" @click.prevent="checkError()">{{
            sheet.fail || "-"
          }}</a>
          / {{ sheet.success || "-" }}</span
        >
      </div>
      <div v-if="true" style="display: flex">
        <div class="item-box">
          <label>Provinsi</label>
          <span
            ><a
              style="color: maroon"
              href="#"
              @click.prevent="checkModal('P')"
              >{{ countes.p || "-" }}</a
            ></span
          >
        </div>
        <div v-if="false" class="item-box">
          <label>Kota/Kab</label>
          <span
            ><a
              style="color: maroon"
              href="#"
              @click.prevent="checkModal('D')"
              >{{ countes.d || "-" }}</a
            ></span
          >
        </div>
        <div v-if="false" class="item-box">
          <label>Kecamatan</label>
          <span>{{ countes.k || "-" }}</span>
        </div>
      </div>
      <div class="item-box" style="margin-left: auto; align-self: center">
        <button @click="refillSheet()" style="">Reload</button>
      </div>
    </div>
    <div
      style="
        flex: auto;
        display: flex;
        flex-direction: row;
        flex-basis: 0;
        height: 100%;
        width: 100%;
      "
    >
      <div style="flex: auto">
        <l-map
          ref="map"
          :zoom="map.zoom"
          :center="map.center"
          :options="map.options"
          @ready="ready"
          style="height: 100%; width: 100%; z-index: 0"
        >
          <l-tile-layer :url="map.url" :attribution="map.attribution" />
          <l-marker v-if="map.marker" :lat-lng="map.marker" />
        </l-map>
      </div>
      <div
        style="flex: 0.2; flex-basis: 0; padding: 5px"
        v-if="state.active_items"
      >
        <div style="text-align: right; padding: 0 8px 10px">
          <button style="margin-left: auto" @click="state.active_items = null">
            Close [X]
          </button>
        </div>
        <div style="height: 400px; overflow: hidden; overflow-y: auto">
          <div v-if="state.active_items" class="show-list">
            <div>
              <label>#{{ state.active_items.index }}</label>
            </div>
            <div>
              <label>Nama Sekolah</label>
              <p>{{ state.active_items.name }}</p>
            </div>
            <div>
              <label>Provinsi</label>
              <p>{{ state.active_items.region.p }}</p>
            </div>
            <div>
              <label>Kab/Kota</label>
              <p>{{ state.active_items.region.k }}</p>
            </div>
            <div>
              <label>Kecamatan</label>
              <p>{{ state.active_items.region.c }}</p>
            </div>
            <div>
              <label>Kelurahan</label>
              <p>{{ state.active_items.region.l }}</p>
            </div>
            <div>
              <label>Alamat</label>
              <p>{{ state.active_items.address }}</p>
            </div>
            <div style="margin-top: 10px">
              <label>Google Conn</label>
              <p>
                <a :href="state.active_items.link_gmap" target="_blank"
                  >Lihat dengan Google Map</a
                >
                &middot;
                <a :href="state.active_items.link_gsrc" target="_blank"
                  >Pencarian dengan Google</a
                >
              </p>
            </div>
            <div style="margin-top: 10px">
              <label>Dapodik</label>
              <p>
                <a :href="state.active_items.link_dapo_1" target="_blank"
                  >Lihat Profil</a
                >
                &middot;
                <a :href="state.active_items.link_dapo_2" target="_blank"
                  >Lihat Referensi</a
                >
                &middot;
                <a :href="state.active_items.link_smk" target="_blank"
                  >Lihat SMK</a
                >
              </p>
            </div>
            <div>
              <label>Kontak</label>
              <p>-</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash";
import { LMap, LTileLayer, LMarker } from "vue2-leaflet";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";
import geosearch from "./geosearch";
import swal from "sweetalert2";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import {
  latLng,
  latLngBounds,
  rectangle,
  featureGroup,
  divIcon,
  marker,
  markerClusterGroup,
} from "leaflet";

export default {
  name: "Example",
  components: {
    LMap,
    LTileLayer,
    LMarker,
    "v-select": vSelect,
  },
  data() {
    return {
      map: {
        el: null,
        zoom: 13,
        center: latLng(-6.2088, 106.8456),
        // url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        options: {},
        marker: null,
        area: null,
        attribution:
          '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      },
      sheet: {
        raw: [],
        list: [],
        groups: [],
        success: 0,
        fail: 0,
        errors: [],
      },
      srefs: { p: null, d: null, k: null },
      state: {
        search: null,
        searchlist: [],
        active_items: null,
        loading: false,
        info: {
          ranges: [0, 0],
          point_count: 0,
          group_count: 0,
        },
      },
      sets: { p: null, d: null, k: null, l: null, i: null },
      countes: { p: 0, d: 0, k: 0, l: 0, i: 0 },
      errors: {
        region: {},
      },
    };
  },
  methods: {
    ready() {
      let el = this.$refs.map.mapObject;
      this.map.el = el;
      // console.log("map is settle", el);
      this.fillSheet();
      this.fillRefSheet();
    },
    async fillSheet() {
      const key = "AIzaSyCkqIagCnQut7KIY5qDOn44fx2mlL5rZvY";
      const sid = "13dvt5GOYpPNrwbol5NTb91AZMsITHi9nnctDoaBQ8tE";
      const range = "List!A2:T21000";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}?key=${key}`;
      swal.showLoading();
      try {
        let data = await axios.get(url);
        data = data.status === 200 ? data.data.values : [];
        data.shift();
        this.resetSheet();
        this.sheet.raw = data;
        let index = 0;
        let currentItem = null;
        for (let item of data) {
          index++;
          try {
            if (!item[1]) {
              throw new Error("ENAME: Nama tidak diketahui");
            }
            const distance = 0.005;
            const rounded = (v, nearest = distance) => {
              return (Math.round(Number(v) / nearest) * nearest).toFixed(3);
            };
            let coord = { lat: parseFloat(item[3]), lng: parseFloat(item[4]) };
            let grid = [
              parseFloat(rounded(coord.lat)),
              parseFloat(rounded(coord.lng)),
            ];
            let info = {
              name: item[1],
              address: item[2].replace(" (master referensi)", ""),
              status: item[6],
              count: { m: item[7], g: item[8], k: item[9], p: item[10] },
              region: { p: item[11], k: item[12], c: item[13], l: item[14] },
              rid: { p: item[17], k: item[18], c: item[19], l: null },
              id: item[15],
              ref: item[16],
              row: item[0],
              index: index,
            };
            currentItem = info;
            let m = {
              ...info,
              latLng: coord,
              sw: latLng(rounded(grid[0]), rounded(grid[1])),
              ne: latLng(
                rounded(grid[0] + distance),
                rounded(grid[1] + distance)
              ),
              center: latLng(grid[0] + distance / 2, grid[1] + distance / 2),
            };
            m.bounds = latLngBounds(m.sw, m.ne);
            this.sheet.list.push(m);
            this.sheet.success += 1;
          } catch (e) {
            if (e.toString().includes("ENAME")) {
              // name error
            } else {
              this.sheet.fail += 1;
              this.sheet.errors.push({
                index: index,
                e: e.toString(),
                item: currentItem,
              });
            }

            // errors per region
            // let errKey = Object.values(currentItem.region).join("|");
            let errKey = currentItem.region.p || "-1";
            if (!this.errors.region[errKey]) this.errors.region[errKey] = 0;
            this.errors.region[errKey] += 1;
          }

          // endfor
        }
        // console.log("errors region", this.errors.region);

        // geo coding
        let clusters = markerClusterGroup({ animate: false });
        for (let item of this.sheet.list) {
          // console.log("item", { item });
          let xmarker = marker(item.latLng);
          xmarker.bindTooltip(
            `<div class="marker-item-tooltip">
              <label>${item.name}</label>
              <p>${item.address} #${item.row}</p>
            </div>`
          );
          xmarker.on("click", () => this.show(item));
          xmarker.addTo(clusters);
        }
        this.map.area = clusters;
        this.map.area.addTo(this.map.el);
        this.map.el.fitBounds(this.map.area.getBounds());

        this.state.info.point_count = this.sheet.raw.length;

        // console.log("sheet info:", this.sheet);
        return this.sheet;
      } catch (e) {
        console.log("SHEET_DATA_ERR", e.toString());
        return [];
      } finally {
        swal.close();
        this.setGridList();
      }
    },
    async fillRefSheet() {
      const key = "AIzaSyCkqIagCnQut7KIY5qDOn44fx2mlL5rZvY";
      const sid = "13dvt5GOYpPNrwbol5NTb91AZMsITHi9nnctDoaBQ8tE";
      const range = "FullReference!A2:P6974";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}?key=${key}`;
      try {
        let data = await axios.get(url);
        data = data.status === 200 ? data.data.values : [];

        let p = _.chain(data)
          .groupBy((x) => x[2])
          .mapKeys((xi, x) => x.replace("Prov. ", "").trim())
          .mapValues((x) => ({
            length: x.length,
            total: x[0][4].replace(".", ""),
          }))
          .value();
        let d = _.chain(data)
          .groupBy((x) => x[7])
          .mapValues((x) => ({
            length: x.length,
            p: x[0][2],
            total: x[0][9].replace(".", ""),
          }))
          .value();
        let k = _.chain(data)
          .groupBy((x) => x[12])
          .mapValues((x) => ({
            length: x.length,
            p: x[0][2],
            d: x[0][7],
            total: x[0][14].replace(".", ""),
          }))
          .value();

        this.srefs = { p, d, k };
        // console.log("check refs", this.srefs);
        this.fillManualRefSheet();
      } catch (e) {
        console.log("ESHEETFULLREF", e.toString());
      }
    },
    async fillManualRefSheet() {
      const key = "AIzaSyCkqIagCnQut7KIY5qDOn44fx2mlL5rZvY";
      const sid = "13dvt5GOYpPNrwbol5NTb91AZMsITHi9nnctDoaBQ8tE";
      const range = "ManualReference!B3:AL37";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}?key=${key}`;
      try {
        let data = await axios.get(url);
        data = data.status === 200 ? data.data.values : [];
        let p = _.chain(data)
          .groupBy((x) => x[0])
          .mapKeys((xi, x) => x.replace("Prov. ", "").trim())
          .mapValues((x) => ({
            length: x.length,
            total: x[0][31].replace(".", ""),
          }))
          .value();
        this.srefs.p = p;
      } catch (e) {
        console.log("ESHEETMANUALREF", e.toString());
      }
    },
    resetSheet() {
      if (this.map.area) this.map.area.clearLayers();
      this.sheet = {
        raw: [],
        list: [],
        groups: [],
        success: 0,
        fail: 0,
        errors: [],
      };
    },
    refillSheet() {
      this.fillSheet();
    },
    checkError() {
      let html = `<table style="width: 100%; font-size: 11px;" border="1">`;
      html += `<tr><th>Baris</th><th>Kesalahan</th><th>Informasi</th></tr>`;
      for (let x of this.sheet.errors) {
        html += `<tr>
        <td>${x.index}</td>
        <td>${x.e}</td>
        <td style="width: 30%; word-wrap: break-word; font-size: 9px;">${
          x.item.address || x.item.name || "-"
        }</td>
        </tr>`;
      }
      html += `</table>`;
      swal.fire({
        title: `Ada ${this.sheet.errors.length} Kesalahan`,
        html: html,
      });
      // console.log("check error log", this.sheet.errors);
    },
    addresses(search) {
      return geosearch()
        .search(search)
        .then((res) => {
          this.state.searchlist = res;
        });
    },
    fetchAddress(search, loading) {
      loading(true);
      // this.search = search
      clearTimeout(this.state.search);
      this.state.search = setTimeout(() => {
        this.addresses(search).then(() => {
          loading(false);
        });
      }, 1000);
    },
    setAddress(v) {
      this.map.marker = [v.y, v.x];
      this.map.el.panTo(this.map.marker);
    },
    show(item) {
      // console.log("key", item);
      item.link_gmap = `https://www.google.com/maps/search/?api=1&query=${Object.values(
        item.latLng
      ).join(",")}`;
      item.link_gsrc = `https://www.google.com/search?q=${[
        item.name,
        item.region.k,
      ].join(", ")}`;
      item.link_dapo_1 = `http://sekolah.data.kemdikbud.go.id/index.php/chome/profil/${item.ref}`;
      item.link_dapo_2 = `https://referensi.data.kemdikbud.go.id/tabs.php?npsn=${item.id}`;
      item.link_smk = `http://peta.ditpsmk.net/peta2/index.php/chome/profilsekolah/${item.ref}`;
      this.state.active_items = item;
      // console.log("key", this.state.active_items);
    },
    setGridList() {
      // created bound group
      const setGroups = () => {
        let boundGroup = _.groupBy(this.sheet.list, (x) =>
          x.bounds.toBBoxString()
        );
        boundGroup = Object.entries(boundGroup).map((item, i) => {
          let m = {
            count: item[1].length,
            key: item[0],
            bounds: item[0].split(","),
            items: item[1],
          };
          m.boundsArr = [
            m.bounds.slice(0, 2).reverse(),
            m.bounds.slice(2).reverse(),
          ];
          m.bounds = latLngBounds(m.boundsArr);
          m.boundCenter = m.bounds.getCenter();
          return m;
        });
        this.sheet.groups = boundGroup;
        let colorNames = ["blue", "green", "red"];
        let ranges = [
          _.minBy(this.sheet.groups, (x) => x.count).count,
          _.maxBy(this.sheet.groups, (x) => x.count).count,
        ];
        this.state.info.ranges = ranges;

        let grids = markerClusterGroup();
        this.sheet.groups.map((m) => {
          let color =
            m.count >= ranges[1] / 1
              ? colorNames[2]
              : m.count >= ranges[1] / 2
              ? colorNames[1]
              : colorNames[0];
          let box = featureGroup();
          m.box = rectangle(m.bounds, {
            weight: 1,
            fillOpacity: 0.3,
            color: color,
            fillColor: color,
          });
          m.box.addTo(box);
          marker(m.bounds.getCenter(), {
            icon: divIcon({
              className: "marker-plot",
              html: `<b>${m.count}</b>`,
            }),
          }).addTo(box);

          m.box.on("click", () => {
            this.show(m.key);
          });
          box.addTo(grids);
          return m;
          // x.box.addTo(this.map.el);
        });
        // if (this.map.area) this.map.area.clearLayers();
        // this.map.area = grids;
        // this.map.area.addTo(this.map.el);

        this.state.info.group_count = this.sheet.groups.length;

        // console.log("boundGroup", boundGroup);
      };

      setGroups();

      // unpack province, dati 2, kec, kel, i
      const getCountList = (key, content = null) =>
        _.chain(this.sheet.list)
          .groupBy((x) => key(x))
          .mapValues((x) => (content ? content(x) : x.length))
          .sort()
          .value();
      this.sets.p = getCountList((x) => x.region.p);
      this.sets.d = getCountList(
        (x) => x.region.k,
        (x) => ({ length: x.length, p: x[0].region.p })
      );
      this.sets.k = getCountList(
        (x) => x.region.c,
        (x) => ({ length: x.length, p: x[0].region.p, d: x[0].region.k })
      );
      this.countes = {
        ...this.countes,
        ...{
          p: Object.keys(this.sets.p).length || 0,
          d: Object.keys(this.sets.d).length || 0,
          k: Object.keys(this.sets.k).length || 0,
        },
      };
    },
    checkModal(key) {
      const table = (data, content = null) => {
        let header = [
          "No.",
          "Nama",
          "Data",
          "Error",
          "Data Rate (%)",
          "Full",
          "Full Rate (%)",
        ];
        header = `<tr>` + header.map((x) => `<td>${x}</td>`) + `</tr>`;
        let rows = Object.entries(data).map((x, i) => {
          let col = x.map((c) => `<td>${c}</td>`);
          let pref = this.srefs.p[x[0]];
          // console.log("this.srefs", x[0], pref);
          return `<tr>
            <td>${i + 1}</td>
            ${col}
            <td>${this.errors.region[x[0]] || 0}</td>
            <td>${(
              ((x[1] - (this.errors.region[x[0]] || 0)) / x[1]) *
              100
            ).toFixed(2)}%</td>
            <td>${pref ? pref.total : 0}</td>
            <td>${
              pref
                ? parseFloat((Number(x[1]) / Number(pref.total)) * 100).toFixed(
                    2
                  )
                : 0
            }%</td>
          </tr>`;
        });
        return (
          `<table border="1" style="font-size: 12px; text-align: left; width: 100%;">` +
          header +
          rows +
          `</table>`
        );
      };
      switch (key) {
        default:
          break;
        case "P":
          swal.fire({
            title: "Provinsi",
            text: "",
            html: table(this.sets.p),
          });
          break;
        case "D":
          swal.fire({
            title: "Kota/Kabupaten",
            html: `<table>` + table(this.sets.d) + `</table>`,
          });
          break;
      }
    },
  },
  mounted() {
    // this.fillSheet();
  },
};
</script>

<style>
body {
  overflow: hidden;
}
.marker-plot b {
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  background: #fff;
  border-radius: 50%;
}
.item-box {
  padding: 0 5px;
  margin: 0 5px;
  text-align: center;
}
.item-box label {
  display: block;
  font-size: 12px;
}
.item-box span {
  font-weight: bold;
}
.list-item {
  padding: 5px;
  margin: 0 5px;
}
.list-item label {
  display: block;
  font-size: 12px;
}
.list-item span {
  font-size: 14px;
  margin-left: auto;
}
.list-item p {
  color: #333;
  font-size: 11px;
  margin: 0;
}
.marker-item-tooltip {
}
.marker-item-tooltip label {
  display: block;
  font-size: 12px;
}
.marker-item-tooltip span {
  font-size: 14px;
  margin-left: auto;
}
.marker-item-tooltip p {
  color: #777;
  font-size: 10px;
  margin: 0;
  max-width: 200px;
  white-space: normal;
  word-wrap: break-word;
}
.info-box {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 5px 0 10px;
}
.info-box .search-box {
  flex: 0.7;
}
.show-list {
  padding: 8px;
}
.show-list * {
  font-size: 12px;
}
.show-list div {
  margin-bottom: 6px;
}
.show-list div label {
  display: block;
  font-size: 10px;
}
.show-list div p {
  font-size: 12px;
  margin: 0;
}
@media screen and (max-width: 1024px) {
  .info-box {
    flex-wrap: wrap-reverse;
  }
  .info-box .search-box {
    flex: auto;
    width: 100%;
    padding: 8px 0;
  }
}
</style>
