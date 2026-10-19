/* Nationwide Media Connect — lga.js
   State + Local Government Area dataset and the profile location picker.
   Sellers set State and LGA in Edit profile; the saved map position comes
   from the centre of their LGA (known centres below), falling back to the
   state centre, so buyers in the same LGA map closely. Loaded after
   extras.js. Data format: "State:LGA|LGA|..." one line per state. */
;(function () {
  "use strict";
  var RAW = [
"Lagos:Agege|Ajeromi-Ifelodun|Alimosho|Amuwo-Odofin|Apapa|Badagry|Epe|Eti-Osa|Ibeju-Lekki|Ifako-Ijaiye|Ikeja|Ikorodu|Kosofe|Lagos Island|Lagos Mainland|Mushin|Ojo|Oshodi-Isolo|Shomolu|Surulere",
"Abuja (FCT):Abaji|Abuja Municipal|Bwari|Gwagwalada|Kuje|Kwali",
"Kano:Ajingi|Albasu|Bagwai|Bebeji|Bichi|Bunkure|Dala|Dambatta|Dawakin Kudu|Dawakin Tofa|Doguwa|Fagge|Gabasawa|Garko|Garun Mallam|Gaya|Gezawa|Gwale|Gwarzo|Kabo|Kano Municipal|Karaye|Kibiya|Kiru|Kumbotso|Kunchi|Kura|Madobi|Makoda|Minjibir|Nasarawa|Rano|Rimin Gado|Rogo|Shanono|Sumaila|Takai|Tarauni|Tofa|Tsanyawa|Tudun Wada|Ungogo|Warawa|Wudil",
"Kaduna:Birnin Gwari|Chikun|Giwa|Igabi|Ikara|Jaba|Jema'a|Kachia|Kaduna North|Kaduna South|Kagarko|Kajuru|Kaura|Kauru|Kubau|Kudan|Lere|Makarfi|Sabon Gari|Sanga|Soba|Zangon Kataf|Zaria",
"Katsina:Bakori|Batagarawa|Batsari|Baure|Bindawa|Charanchi|Dan Musa|Dandume|Danja|Daura|Dutsi|Dutsin-Ma|Faskari|Funtua|Ingawa|Jibia|Kafur|Kaita|Kankara|Kankia|Katsina|Kurfi|Kusada|Mai'Adua|Malumfashi|Mani|Mashi|Matazu|Musawa|Rimi|Sabuwa|Safana|Sandamu|Zango",
"Sokoto:Binji|Bodinga|Dange Shuni|Gada|Goronyo|Gudu|Gwadabawa|Illela|Isa|Kebbe|Kware|Rabah|Sabon Birni|Shagari|Silame|Sokoto North|Sokoto South|Tambuwal|Tangaza|Tureta|Wamako|Wurno|Yabo",
"Zamfara:Anka|Bakura|Birnin Magaji|Bukkuyum|Bungudu|Gummi|Gusau|Kaura Namoda|Maradun|Maru|Shinkafi|Talata Mafara|Tsafe|Zurmi",
"Kebbi:Aleiro|Arewa Dandi|Argungu|Augie|Bagudo|Birnin Kebbi|Bunza|Dandi|Fakai|Gwandu|Jega|Kalgo|Koko/Besse|Maiyama|Ngaski|Sakaba|Shanga|Suru|Wasagu/Danko|Yauri|Zuru",
"Jigawa:Auyo|Babura|Biriniwa|Birnin Kudu|Buji|Dutse|Gagarawa|Garki|Gumel|Guri|Gwaram|Gwiwa|Hadejia|Jahun|Kafin Hausa|Kaugama|Kazaure|Kiri Kasama|Kiyawa|Maigatari|Malam Madori|Miga|Ringim|Roni|Sule Tankarkar|Taura|Yankwashi",
"Yobe:Bade|Bursari|Damaturu|Fika|Fune|Geidam|Gujba|Gulani|Jakusko|Karasuwa|Machina|Nangere|Nguru|Potiskum|Tarmuwa|Yunusari|Yusufari",
"Borno:Abadam|Askira/Uba|Bama|Bayo|Biu|Chibok|Damboa|Dikwa|Gubio|Guzamala|Gwoza|Hawul|Jere|Kaga|Kala/Balge|Konduga|Kukawa|Kwaya Kusar|Mafa|Magumeri|Maiduguri|Marte|Mobbar|Monguno|Ngala|Nganzai|Shani",
"Bauchi:Alkaleri|Bauchi|Bogoro|Damban|Darazo|Dass|Gamawa|Ganjuwa|Giade|Itas/Gadau|Jama'are|Katagum|Kirfi|Misau|Ningi|Shira|Tafawa Balewa|Toro|Warji|Zaki",
"Gombe:Akko|Balanga|Billiri|Dukku|Funakaye|Gombe|Kaltungo|Kwami|Nafada|Shongom|Yamaltu/Deba",
"Adamawa:Demsa|Fufore|Ganye|Girei|Gombi|Guyuk|Hong|Jada|Lamurde|Madagali|Maiha|Mayo Belwa|Michika|Mubi North|Mubi South|Numan|Shelleng|Song|Toungo|Yola North|Yola South",
"Taraba:Ardo Kola|Bali|Donga|Gashaka|Gassol|Ibi|Jalingo|Karim Lamido|Kurmi|Lau|Sardauna|Takum|Ussa|Wukari|Yorro|Zing",
"Kwara:Asa|Baruteen|Edu|Ekiti|Ifelodun|Ilorin East|Ilorin South|Ilorin West|Irepodun|Isin|Kaiama|Moro|Offa|Oke Ero|Oyun|Pategi",
"Kogi:Adavi|Ajaokuta|Ankpa|Bassa|Dekina|Ibaji|Idah|Igalamela-Odolu|Ijumu|Kabba/Bunu|Kogi|Lokoja|Mopa-Muro|Ofu|Ogori/Magongo|Okehi|Okene|Olamaboro|Omala|Yagba East|Yagba West",
"Niger:Agaie|Agwara|Bida|Borgu|Bosso|Chanchaga|Edati|Gbako|Gurara|Katcha|Kontagora|Lapai|Lavun|Magama|Mariga|Mashegu|Mokwa|Moya|Paikoro|Rafi|Rijau|Shiroro|Suleja|Tafa|Wushishi",
"Nasarawa:Akwanga|Awe|Doma|Karu|Keana|Keffi|Kokona|Lafia|Nasarawa|Nasarawa Egon|Obi|Toto|Wamba",
"Plateau:Barkin Ladi|Bassa|Bokkos|Jos East|Jos North|Jos South|Kanam|Kanke|Langtang North|Langtang South|Mangu|Mikang|Pankshin|Qua'an Pan|Riyom|Shendam|Wase",
"Benue:Ado|Agatu|Apa|Buruku|Gboko|Guma|Gwer East|Gwer West|Katsina-Ala|Konshisha|Kwande|Logo|Makurdi|Obi|Ogbadibo|Ohimini|Oju|Okpokwu|Otukpo|Tarka|Ukum|Ushongo|Vandeikya",
"Enugu:Aninri|Awgu|Enugu East|Enugu North|Enugu South|Ezeagu|Igbo Etiti|Igbo Eze North|Igbo Eze South|Isi Uzo|Nkanu East|Nkanu West|Nsukka|Oji River|Udenu|Udi|Uzo-Uwani",
"Ebonyi:Abakaliki|Afikpo North|Afikpo South|Ebonyi|Ezza North|Ezza South|Ikwo|Ishielu|Ivo|Izzi|Ohaozara|Ohaukwu|Onicha",
"Anambra:Aguata|Anambra East|Anambra West|Anaocha|Awka North|Awka South|Ayamelum|Dunukofia|Ekwusigo|Idemili North|Idemili South|Ihiala|Njikoka|Nnewi North|Nnewi South|Ogbaru|Onitsha North|Onitsha South|Orumba North|Orumba South|Oyi",
"Imo:Aboh Mbaise|Ahiazu Mbaise|Ehime Mbano|Ezinihitte|Ideato North|Ideato South|Ihitte/Uboma|Ikeduru|Isiala Mbano|Isu|Mbaitoli|Ngor Okpala|Njaba|Nkwerre|Nwangele|Obowo|Oguta|Ohaji/Egbema|Okigwe|Onuimo|Orlu|Orsu|Oru East|Oru West|Owerri Municipal|Owerri North|Owerri West",
"Abia:Aba North|Aba South|Arochukwu|Bende|Ikwuano|Isiala Ngwa North|Isiala Ngwa South|Isuikwuato|Obi Ngwa|Ohafia|Osisioma|Ugwunagbo|Ukwa East|Ukwa West|Umuahia North|Umuahia South|Umu Nneochi",
"Delta:Aniocha North|Aniocha South|Bomadi|Burutu|Ethiope East|Ethiope West|Ika North East|Ika South|Isoko North|Isoko South|Ndokwa East|Ndokwa West|Okpe|Oshimili North|Oshimili South|Patani|Sapele|Udu|Ughelli North|Ughelli South|Ukwuani|Uvwie|Warri North|Warri South|Warri South West",
"Edo:Akoko-Edo|Egor|Esan Central|Esan North-East|Esan South-East|Esan West|Etsako Central|Etsako East|Etsako West|Igueben|Ikpoba-Okha|Oredo|Orhionmwon|Ovia North-East|Ovia South-West|Owan East|Owan West|Uhunmwonde",
"Bayelsa:Brass|Ekeremor|Kolokuma/Opokuma|Nembe|Ogbia|Sagbama|Southern Ijaw|Yenagoa",
"Rivers:Abua/Odual|Ahoada East|Ahoada West|Akuku-Toru|Andoni|Asari-Toru|Bonny|Degema|Eleme|Emohua|Etche|Gokana|Ikwerre|Khana|Obio/Akpor|Ogba/Egbema/Ndoni|Ogu/Bolo|Okrika|Omuma|Opobo/Nkoro|Oyigbo|Port Harcourt|Tai",
"Akwa Ibom:Abak|Eastern Obolo|Eket|Esit Eket|Essien Udim|Etim Ekpo|Etinan|Ibeno|Ibesikpo Asutan|Ibiono-Ibom|Ika|Ikono|Ikot Abasi|Ikot Ekpene|Ini|Itu|Mbo|Mkpat-Enin|Nsit-Atai|Nsit-Ibom|Nsit-Ubium|Obot Akara|Okobo|Onna|Oron|Oruk Anam|Udung-Uko|Ukanafun|Uruan|Urue-Offong/Oruko|Uyo",
"Cross River:Abi|Akamkpa|Akpabuyo|Bakassi|Bekwarra|Biase|Boki|Calabar Municipal|Calabar South|Etung|Ikom|Obanliku|Obubra|Obudu|Odukpani|Ogoja|Yakurr|Yala",
"Ondo:Akoko North-East|Akoko North-West|Akoko South-East|Akoko South-West|Akure North|Akure South|Ese Odo|Idanre|Ifedore|Ilaje|Ile Oluji/Okeigbo|Irele|Odigbo|Okitipupa|Ondo East|Ondo West|Ose|Owo",
"Ekiti:Ado Ekiti|Efon|Ekiti East|Ekiti South-West|Ekiti West|Emure|Gbonyin|Ido Osi|Ijero|Ikere|Ikole|Ilejemeje|Irepodun/Ifelodun|Ise/Orun|Moba|Oye",
"Osun:Aiyedaade|Aiyedire|Atakumosa East|Atakumosa West|Boluwaduro|Boripe|Ede North|Ede South|Egbedore|Ejigbo|Ife Central|Ife East|Ife North|Ife South|Ifedayo|Ifelodun|Ila|Ilesa East|Ilesa West|Irepodun|Irewole|Isokan|Iwo|Obokun|Odo Otin|Ola Oluwa|Olorunda|Oriade|Orolu|Osogbo",
"Ogun:Abeokuta North|Abeokuta South|Ado-Odo/Ota|Ewekoro|Ifo|Ijebu East|Ijebu North|Ijebu North East|Ijebu Ode|Ikenne|Imeko-Afon|Ipokia|Obafemi-Owode|Odeda|Odogbolu|Ogun Waterside|Remo North|Shagamu|Yewa North|Yewa South",
"Oyo:Afijio|Akinyele|Atiba|Atisbo|Egbeda|Ibadan North|Ibadan North-East|Ibadan North-West|Ibadan South-East|Ibadan South-West|Ibarapa Central|Ibarapa East|Ibarapa North|Ido|Irepo|Iseyin|Itesiwaju|Iwajowa|Kajola|Lagelu|Ogbomosho North|Ogbomosho South|Ogo Oluwa|Olorunsogo|Oluyole|Ona Ara|Orelope|Ori Ire|Oyo East|Oyo West|Saki East|Saki West|Surulere"
  ];
  var LGA = {};
  RAW.forEach(function (line) {
    var i = line.indexOf(":");
    LGA[line.slice(0, i)] = line.slice(i + 1).split("|");
  });
  window.NM_LGA = LGA;
  window.NM_LGA_STATES = Object.keys(LGA);

  /* Centre coordinates for the LGAs we know confidently ("State|LGA": [lat, lng]).
     Anything missing falls back to the state centre in NM_stateCoord. */
  var COORDS = {
    "Lagos|Agege": [6.618, 3.327], "Lagos|Ajeromi-Ifelodun": [6.447, 3.327], "Lagos|Alimosho": [6.601, 3.290],
    "Lagos|Amuwo-Odofin": [6.450, 3.300], "Lagos|Apapa": [6.448, 3.360], "Lagos|Badagry": [6.415, 2.882],
    "Lagos|Epe": [6.584, 3.977], "Lagos|Eti-Osa": [6.470, 3.640], "Lagos|Ibeju-Lekki": [6.480, 3.870],
    "Lagos|Ifako-Ijaiye": [6.650, 3.320], "Lagos|Ikeja": [6.605, 3.349], "Lagos|Ikorodu": [6.620, 3.510],
    "Lagos|Kosofe": [6.605, 3.410], "Lagos|Lagos Island": [6.450, 3.400], "Lagos|Lagos Mainland": [6.505, 3.378],
    "Lagos|Mushin": [6.527, 3.354], "Lagos|Ojo": [6.462, 3.164], "Lagos|Oshodi-Isolo": [6.555, 3.344],
    "Lagos|Shomolu": [6.540, 3.377], "Lagos|Surulere": [6.500, 3.358],
    "Abuja (FCT)|Abaji": [8.870, 6.940], "Abuja (FCT)|Abuja Municipal": [9.030, 7.490], "Abuja (FCT)|Bwari": [9.280, 7.380],
    "Abuja (FCT)|Gwagwalada": [8.943, 6.993], "Abuja (FCT)|Kuje": [8.879, 7.227], "Abuja (FCT)|Kwali": [8.850, 7.020],
    "Kano|Kano Municipal": [12.002, 8.592], "Kano|Fagge": [12.006, 8.535], "Kano|Gwale": [11.995, 8.490],
    "Kano|Dala": [12.012, 8.505], "Kano|Nasarawa": [12.980, 8.560], "Kano|Tarauni": [11.975, 8.565],
    "Kaduna|Kaduna North": [10.541, 7.447], "Kaduna|Kaduna South": [10.478, 7.421], "Kaduna|Zaria": [11.085, 7.720],
    "Kaduna|Chikun": [10.455, 7.435], "Rivers|Port Harcourt": [5.005, 6.999], "Rivers|Obio/Akpor": [5.030, 7.000],
    "Rivers|Eleme": [5.065, 7.230], "Rivers|Oyigbo": [5.155, 7.130], "Oyo|Ibadan North": [7.420, 3.913],
    "Oyo|Ibadan North-East": [7.395, 3.940], "Oyo|Ibadan North-West": [7.405, 3.875], "Oyo|Ibadan South-East": [7.365, 3.905],
    "Oyo|Ibadan South-West": [7.365, 3.876], "Oyo|Akinyele": [7.594, 3.913], "Oyo|Lagelu": [7.430, 4.010],
    "Oyo|Egbeda": [7.380, 3.960], "Oyo|Oluyole": [7.360, 3.840], "Edo|Oredo": [6.339, 5.617],
    "Edo|Ikpoba-Okha": [6.320, 5.660], "Edo|Egor": [6.375, 5.570], "Delta|Warri South": [5.516, 5.745],
    "Delta|Sapele": [5.894, 5.677], "Delta|Uvwie": [5.560, 5.770], "Delta|Oshimili South": [6.200, 6.730],
    "Akwa Ibom|Uyo": [5.051, 7.933], "Cross River|Calabar Municipal": [4.975, 8.341], "Cross River|Calabar South": [4.945, 8.335],
    "Enugu|Enugu North": [6.465, 7.510], "Enugu|Enugu South": [6.430, 7.515], "Enugu|Enugu East": [6.465, 7.560],
    "Enugu|Nsukka": [6.857, 7.396], "Anambra|Onitsha North": [6.167, 6.783], "Anambra|Onitsha South": [6.145, 6.790],
    "Anambra|Awka South": [6.210, 7.072], "Abia|Aba South": [5.106, 7.367], "Abia|Aba North": [5.125, 7.375],
    "Abia|Umuahia North": [5.525, 7.493], "Imo|Owerri Municipal": [5.485, 7.035], "Imo|Owerri North": [5.510, 7.050],
    "Plateau|Jos North": [9.928, 8.892], "Plateau|Jos South": [9.880, 8.885], "Kwara|Ilorin West": [8.500, 4.541],
    "Kwara|Ilorin East": [8.510, 4.580], "Kwara|Ilorin South": [8.470, 4.560], "Osun|Osogbo": [7.783, 4.567],
    "Ekiti|Ado Ekiti": [7.623, 5.220], "Ondo|Akure South": [7.250, 5.199], "Ogun|Abeokuta South": [7.148, 3.361],
    "Ogun|Ado-Odo/Ota": [6.690, 3.235], "Ogun|Ijebu Ode": [6.825, 3.920], "Borno|Maiduguri": [11.833, 13.151],
    "Bauchi|Bauchi": [10.315, 9.844], "Sokoto|Sokoto North": [13.066, 5.240], "Sokoto|Sokoto South": [13.045, 5.250],
    "Gombe|Gombe": [10.290, 11.167], "Yobe|Damaturu": [11.747, 11.966], "Adamawa|Yola North": [9.209, 12.482],
    "Adamawa|Yola South": [9.175, 12.460], "Benue|Makurdi": [7.732, 8.539], "Nasarawa|Lafia": [8.493, 8.516],
    "Nasarawa|Karu": [9.010, 7.600], "Kogi|Lokoja": [7.800, 6.740], "Niger|Chanchaga": [9.615, 6.557],
    "Niger|Suleja": [9.181, 7.179], "Katsina|Katsina": [12.991, 7.601], "Jigawa|Dutse": [11.828, 9.338],
    "Zamfara|Gusau": [12.165, 6.664], "Bayelsa|Yenagoa": [4.926, 6.264], "Taraba|Jalingo": [8.893, 11.360],
    "Ebonyi|Abakaliki": [6.325, 8.114], "Kebbi|Birnin Kebbi": [12.450, 4.200]
  };
  window.NM_LGA_COORDS = COORDS;
  window.NM_lgaCoord = function (state, lga) {
    var c = COORDS[(state || "") + "|" + (lga || "")];
    return c ? { lat: c[0], lng: c[1] } : null;
  };
})();

/* ===== nm-lga-ui: State + LGA dropdowns inside Edit profile ===== */
;(function () {
  "use strict";
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { try { if (window.NM_int) { window.NM_int.toast(m); } } catch (e) {} }
  try {
    var st = document.createElement("style");
    st.id = "nm-lga-css";
    st.textContent = ".nm-lga{margin:2px 0 12px}"
      + ".nm-lga-hd{font-size:13px;font-weight:700;color:var(--muted);margin:10px 0 2px}"
      + ".nm-lga-sel{width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--ink);font:inherit;font-size:14.5px;padding:9px 2px;border-radius:0}"
      + ".nm-lga-sel:focus{outline:0;border-bottom-color:var(--acc2)}"
      + ".nm-lga-sel option{color:#111}"
      + ".nm-lga-note{font-size:12px;color:var(--faint);line-height:1.5;margin-top:6px}"
      + "#nm-lga-save{width:100%;margin-top:10px}";
    document.head.appendChild(st);
  } catch (e) {}

  function buildLgaOptions(sel, state, current, filter) {
    var full = (window.NM_LGA && window.NM_LGA[state]) || [];
    var q = (filter || "").trim().toLowerCase();
    var list = q ? full.filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; }) : full;
    sel.innerHTML = '<option value="">Select LGA</option>' + list.map(function (n) {
      return '<option value="' + n + '"' + (n === current ? " selected" : "") + ">" + n + "</option>";
    }).join("");
    sel.disabled = !full.length;
  }
  function inject() {
    var form = document.getElementById("profile-form");
    if (!form || document.getElementById("nm-lga-block")) { return; }
    if (!window.NM_LGA) { return; }
    var block = document.createElement("div");
    block.className = "nm-lga";
    block.id = "nm-lga-block";
    block.innerHTML = '<div class="nm-lga-hd">Your location (state and LGA)</div>'
      + '<select class="nm-lga-sel" id="nm-lga-state" aria-label="Your state"><option value="">Select state</option>'
      + window.NM_LGA_STATES.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("")
      + '</select>'
      + '<select class="nm-lga-sel" id="nm-lga-lga" aria-label="Your local government area" disabled><option value="">Select state first</option></select>'
      + '<div class="nm-lga-hd">Exact location (optional)</div>'
      + '<input class="nm-lga-sel" id="nm-lga-addr" type="text" maxlength="140" placeholder="e.g. 14 Allen Avenue, or a nearby landmark" aria-label="Your exact location">'
      + '<p class="nm-lga-note">Buyers see your LGA, your state and how far you are, measured from the centre of your LGA. Your exact location shows on your store page only, so write a street or a nearby landmark only if you are happy for buyers to see it.</p>'
      + '<button type="button" class="loc-btn primary" id="nm-lga-save">Save location</button>';
    var saveBtn = form.querySelector('button[type="submit"], .btn-primary');
    if (saveBtn && saveBtn.parentNode === form) { form.insertBefore(block, saveBtn); } else { form.appendChild(block); }
    var stateSel = $("#nm-lga-state", block), lgaSel = $("#nm-lga-lga", block);
    stateSel.addEventListener("change", function () { buildLgaOptions(lgaSel, stateSel.value, "", ""); });
    block.querySelector("#nm-lga-save").addEventListener("click", function () {
      var state = stateSel.value, lga = lgaSel.value;
      if (!state || !lga) { toast("Please choose your state and your LGA first."); return; }
      var DB = window.NM_DB, my = window.NM_int && window.NM_int.me ? window.NM_int.me() : null;
      if (!DB || !DB.client || !my) { toast("Please log in again and try once more."); return; }
      var btn = block.querySelector("#nm-lga-save");
      btn.disabled = true;
      var addrEl = block.querySelector("#nm-lga-addr");
      var addr = addrEl ? addrEl.value.trim().slice(0, 140) : "";
      DB.client.from("profiles").update({ state: state, lga: lga, address: addr || null }).eq("id", my).then(function (r) {
        btn.disabled = false;
        if (r && r.error) { toast("Could not save your location. Please try again."); return; }
        var c = window.NM_lgaCoord(state, lga) || (window.NM_stateCoord ? window.NM_stateCoord(state) : null);
        if (c && window.NM_saveMyLoc) { window.NM_saveMyLoc(c.lat, c.lng); }
        toast("Location saved: " + lga + ", " + state + ".");
      }).catch(function () { btn.disabled = false; toast("Could not save your location. Please try again."); });
    });
    /* Prefill from the saved profile. */
    var tries = 0;
    (function prefill() {
      var DB = window.NM_DB, my = window.NM_int && window.NM_int.me ? window.NM_int.me() : null;
      if (!DB || !DB.client || !my) { if (++tries < 12) { setTimeout(prefill, 400); } return; }
      DB.client.from("profiles").select("state,lga,address").eq("id", my).maybeSingle().then(function (r) {
        var d = r && r.data;
        if (!d || !document.getElementById("nm-lga-block")) { return; }
        if (d.state) { stateSel.value = d.state; buildLgaOptions(lgaSel, d.state, d.lga || ""); }
        var addrEl2 = block.querySelector("#nm-lga-addr");
        if (addrEl2 && d.address) { addrEl2.value = d.address; }
      }).catch(function () {});
    })();
  }
  try {
    if (window.MutationObserver) {
      new MutationObserver(function () { inject(); }).observe(document.body, { childList: true, subtree: true });
    }
    setTimeout(inject, 1800);
  } catch (e) {}
})();

/* ===== nm-store-loc: the seller's saved location on their store page ===== */
;(function () {
  "use strict";
  function SB() { return window.NM_DB && window.NM_DB.client; }
  function showLoc(sid) {
    var screen = document.getElementById("screen-seller");
    if (!screen || !screen.classList.contains("active") || !SB()) { return; }
    SB().from("profiles").select("state,lga,address").eq("id", sid).maybeSingle().then(function (r) {
      var d = r && r.data;
      if (!d || (!d.state && !d.address)) { return; }
      var scr = document.getElementById("screen-seller");
      if (!scr || !scr.classList.contains("active")) { return; }
      var prev = document.getElementById("nm-store-loc");
      if (prev && prev.getAttribute("data-sid") === String(sid)) { return; }
      if (prev) { prev.remove(); }
      var hero = scr.querySelector(".store2-hero") || scr.querySelector(".store2-head") || scr.querySelector("h2");
      if (!hero || !hero.parentNode) { return; }
      var line = document.createElement("div");
      line.id = "nm-store-loc";
      line.setAttribute("data-sid", String(sid));
      line.style.cssText = "margin:10px 14px 0;font-size:13.5px;font-weight:700;color:var(--muted)";
      var txt = "";
      if (d.lga && d.state) { txt = d.lga + ", " + d.state; } else if (d.state) { txt = d.state; }
      if (d.address) { txt += (txt ? " · " : "") + d.address; }
      line.textContent = "📍 " + txt;
      hero.parentNode.insertBefore(line, hero.nextSibling);
    }).catch(function () {});
  }
  window.NM_storeLoc = showLoc;
  try {
    var iv = setInterval(function () {
      var orig = window.NM_openStore;
      if (typeof orig === "function" && !orig._nmLocWrapped) {
        var w = function (sid) {
          var r = orig.apply(this, arguments);
          var n = 0;
          var t = setInterval(function () { n++; showLoc(sid); if (document.getElementById("nm-store-loc") || n > 20) { clearInterval(t); } }, 300);
          return r;
        };
        w._nmLocWrapped = true;
        window.NM_openStore = w;
        clearInterval(iv);
      }
    }, 600);
    setTimeout(function () { clearInterval(iv); }, 25000);
  } catch (e) {}
})();
