<template>
  <div>
    <div style="margin-bottom: 20px">
      <label style="display: block">Display Data For</label>
      <label>From: <input type="text/" v-model="input.from" /></label>
      <label>To: <input type="text/" v-model="input.to" /></label>
    </div>

    <div>
      <table style="width: 100%" border="1">
        <thead>
          <tr>
            <th>No.</th>
            <th>Nama</th>
            <th>Prov</th>
            <th>Kota/Kab</th>
            <th>Kec</th>
            <th>Kel</th>
            <th>NPSN</th>
            <th>IDREF</th>
            <th>Link Profil</th>
            <th>Link Referensi</th>
            <th>Link SMK</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in list" :key="i">
            <td>{{ item.index }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.region.p }}</td>
            <td>{{ item.region.k }}</td>
            <td>{{ item.region.c }}</td>
            <td>{{ item.region.l }}</td>
            <td>{{ item.id }}</td>
            <td>{{ item.ref }}</td>
            <td><a :href="item.link_dapo_1">Link Profil</a></td>
            <td><a :href="item.link_dapo_2">Link Referensi</a></td>
            <td><a :href="item.link_smk">Link SMK</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";
import geosearch from "./geosearch";
import swal from "sweetalert2";

export default {
  name: "Example",
  data() {
    return {
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
      input: { from: 0, to: 500 },
    };
  },
  computed: {
    list() {
      let from = this.input.from;
      let to = this.input.to;
      try {
        return this.sheet.list.slice(from, to);
      } catch (e) {
        return [];
      }
    },
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
            info.link_dapo_1 = `http://sekolah.data.kemdikbud.go.id/index.php/chome/profil/${info.ref}`;
            info.link_dapo_2 = `https://referensi.data.kemdikbud.go.id/tabs.php?npsn=${info.id}`;
            info.link_smk = `http://peta.ditpsmk.net/peta2/index.php/chome/profilsekolah/${info.ref}`;
            currentItem = info;
            let m = info;
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
        return this.sheet;
      } catch (e) {
        console.log("SHEET_DATA_ERR", e.toString());
        return [];
      } finally {
        swal.close();
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
  created() {
    this.fillSheet();
  },
  watch: {
    "$route.query": {
      deep: true,
      immediate: true,
      handler(val) {
        this.input.from = Number(val.from) || 0;
        this.input.to = Number(val.to) || 0;
      },
    },
  },
};
</script>

<style scoped>
table {
  font-size: 12px;
}
@media screen and (max-width: 1024px) {
}
</style>
