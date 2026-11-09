// ---------- page script 1 ----------
if (enabledModNames.length > 0) {
	document.getElementById("loadingP").innerHTML +=
		` Not loading? <a href="#" onclick="localStorage.removeItem('enabledMods');location.reload()">Click to Clear Mods</a>`;
	document.getElementById("loadingP").style.fontSize = "0.8em";
}

// ---------- page script 2 ----------
// if it is the 1st of April, add a rainbow-colored button
if (!standalone && new Date().getMonth() == 3 && new Date().getDate() <= 3) {
	// if url contains "fools=true"
	if (!window.location.href.includes("fools=true")) {
		var foolsButton = `<button id="foolsButton" title="Enable FOOLS Mode" class="controlButton" onclick="window.location.href = '?fools=true'" style="background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3); background-size: 800% 800%; animation: rainbow 15s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; border-color: #ff00ff; outline: none; text-shadow: 0px 0px 10px #ff00ff;">Fools</button>`;
	} else {
		var foolsButton = `<button id="foolsButton" title="Disable FOOLS Mode" class="controlButton" onclick="window.location.href = '?fools=false'" style="background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3); background-size: 800% 800%; animation: rainbow 15s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; border-color: #ff00ff; text-shadow: 0px 0px 10px #ff00ff;">Escape</button>`;
	}
	// insert before pauseButton
	document.getElementById("pauseButton").insertAdjacentHTML("beforebegin", foolsButton);
}
if (isMobile) {
	document.getElementById("shiftButton").style.display = "flex";
}

// ---------- page script 3 ----------
// If enabledMods has items, add an li to modManagerList for each item with the href to the item, target blank, and the item's name, with "<span class="removeModX" onclick='removeMod('>X</span>" after the link
if (enabledMods.length > 0) {
	modManagerList = document.getElementById("modManagerList");
	for (var i = 0; i < enabledMods.length; i++) {
		var mod = enabledMods[i];
		// modName is the last part of the mod's path
		var modName = mod.split("/").pop();
		let url = mod;
		if (url.startsWith("mods/") && !isLocalFile) {
			url = "https://mods.r74n.com/" + url;
		}
		modManagerList.innerHTML += `<li><a href="${url.replaceAll('"', "")}" target="_blank">${modName}</a> <span class="removeModX" onclick='removeMod("${mod.replaceAll('"', '\\\"')}")'>X</span></li>`;
	}
} else {
	document.getElementById("noMods").style.display = "block";
}

// ---------- page script 4 ----------
let footerVersion = document.querySelector(".footer-version");
footerVersion.innerText = "v" + currentversion;
if (standalone) {
	footerVersion.onclick = undefined;
	footerVersion.href = "https://sandboxels.r74n.com/changelog";
}

// version check
if (!settings["lastversion"] || settings["lastversion"] !== currentversion) {
	document
		.querySelector(".footer-version")
		.insertAdjacentHTML("beforeend", `<span style="color:#ff9191;font-style:italic"> NEW</span>`);
}
document.querySelector(".footer-version").addEventListener("click", function () {
	document.querySelector(".footer-version").innerText = "v" + currentversion;
	setSetting("lastversion", currentversion);
});

if (isNewPlayer) {
	document.getElementById("gameInfo").style.display = "inline";
}

// ---------- page script 5 ----------
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	deferredPrompt = e;
	document.getElementById("install-button").style.display = "inline-block";
});

// ---------- page script 6 ----------
window.addEventListener("load", function () {
	var langSelect = document.getElementById("langSelect");
	if (langCode) {
		langSelect.value = langCode;
	} else if (settings.lang) {
		langSelect.value = settings.lang;
	} else {
		langSelect.value = "en";
	}
	if (lang["#lang.credit"]) {
		document.getElementById("creditTab").style.display = "";
		document.getElementById("langCredit").innerText = "Translation by " + lang["#lang.credit"];
		document.getElementById("langCredit").style.display = "block";
	}
});

// ---------- page script 7 ----------
// Language Loader Part 3 (GUI)
if (lang) {
	for (let key in lang) {
		if (!lang[key]) continue;
		if (key.indexOf("gui.") === 0) {
			let id = key.substr(4);
			let qual;
			if (id.indexOf(".") !== -1) {
				let split = id.split(".");
				id = split[0];
				qual = split[1];
			}
			let e = document.getElementById(id);
			if (e) {
				if (e.classList.contains("icon")) continue;
				if (!qual) {
					if (e.getAttribute("type") === "button") e.value = lang[key];
					if (e.hasAttribute("placeholder")) e.setAttribute("placeholder", lang[key]);
					if (e.hasAttribute("content")) e.setAttribute("content", lang[key]);
					else e.innerText = lang[key];
				} else if (qual === "title") e.title = lang[key];
			} else {
				console.log(langCode + " Invalid GUI Element '" + id + "'");
			}
		}
	}
	let themeOptions = document.querySelector("span[setting=theme] select").options;
	for (let i = 0; i < themeOptions.length; i++) {
		const opt = themeOptions[i];
		if (lang[opt.value]) opt.innerText = elemTitleCase(lang[opt.value]);
	}
}

if (standalone) {
	//document.getElementById("bottomInfoBox").style.display = "none";
	let pagetitle = document.getElementById("pagetitle");
	if (pagetitle) document.getElementById("pagetitle").style.display = "none";
	document.getElementById("noMods").insertAdjacentHTML("afterend", "Requires Internet connection.<br><br>");
	document.getElementById("gameDiv").classList.add("standalone");
	if (isMobile) {
		document.getElementById("gameDiv").classList.add("mobile");
	}
	if (standaloneType === "discord") {
		// document.getElementById("savesButton").style.display = "none";
		// document.querySelector("#savesMenu .menuTabs").style.display = "none";
		document.querySelector("#savesMenu div.menuTab[data-tab='local']").classList.remove("selected");
		document.querySelector("#savesMenu div.menuTab[data-tab='discord']").classList.add("selected");
		document.querySelector("#savesMenu button.menuTab[data-tab='local']").classList.remove("selected");
		document.querySelector("#savesMenu button.menuTab[data-tab='discord']").classList.add("selected");
		document.querySelectorAll("#savesMenu button.menuTab").forEach((e) => {
			if (e.id !== "savesTabDiscord") e.style.display = "none";
		});
		document.getElementById("savesButton").addEventListener("click", showDiscordSaves);
		document.getElementById("modsButton").style.display = "none";
	}
	if (standaloneType === "steam") {
		// Hide scrollbars
		document.head.insertAdjacentHTML("beforeend", `<style>::-webkit-scrollbar { display: none; }</style>`);
		document.getElementById("setting-pixelsize-6w").value = "7w";
		document.getElementById("setting-pixelsize-6w").innerText =
			document.getElementById("setting-pixelsize-6").innerText;
		document.getElementById("setting-pixelsize-6").innerText = "Square";
		document.getElementById("setting-pixelsize-12").value = "12w";
		document.getElementById("setting-pixelsize-8").value = "8w";
		document.getElementById("setting-pixelsize-4").value = "5w";
	}
}

// ---------- page script 8 ----------
if (!standalone)
	window.addEventListener("load", function () {
		// after load on purpose: the game unpauses on load, and ad scripts injected earlier would hold that event open
		window.ramp = window.ramp || {};
		window.ramp.que = window.ramp.que || [];
		window.ramp.passiveMode = true;

		// Picks which skyscraper (if any) fits, and sets a matching ad-layout-* class on <html>
		// that style.css uses to position the game. Returns "right", "left" or null.
		var AD_WIDTH = 160,
			AD_GAP = 10,
			LEFT_LAYOUT_MIN = 1180,
			RIGHT_LAYOUT_MIN = 1330;
		function updateAdLayout() {
			var w = window.innerWidth;
			var gameDiv = document.getElementById("gameDiv");
			var gameW = gameDiv ? gameDiv.offsetWidth : 0;
			var wideCanvas = settings.pixelsize && /w$/.test(String(settings.pixelsize));
			var layout = null;
			if (!wideCanvas) {
				if (w >= RIGHT_LAYOUT_MIN && (w - gameW) / 2 >= AD_WIDTH)
					layout = "right"; // ad fits beside the centered game
				else if (w >= LEFT_LAYOUT_MIN && w < RIGHT_LAYOUT_MIN && AD_WIDTH + AD_GAP + gameW <= w) layout = "left";
			}
			document.documentElement.classList.toggle("ad-layout-right", layout === "right");
			document.documentElement.classList.toggle("ad-layout-left", layout === "left");
			return layout;
		}
		updateAdLayout();
		window.addEventListener("resize", updateAdLayout);
		runAfterReset(updateAdLayout);

		window.ramp.que.push(function () {
			var layout = updateAdLayout();
			if (!layout) return;
			ramp
				.addUnits({
					selectorId: layout + "_skyscraper",
					type: "sky_atf",
				})
				.then(() => {
					ramp.displayUnits();
				})
				.catch((e) => {
					console.error(e);
				});
		});

		var s = document.createElement("script");
		s.src = "https://cdn.intergient.com/1024587/73417/ramp.js";
		s.async = true;
		document.body.appendChild(s);
	});

// ---------- page script 9 ----------
(function () {
	function f() {
		var g = document.getElementById("gameDiv"),
			o = document.querySelector(".footer");
		if (g && o) o.style.width = g.offsetWidth + "px";
	}
	addEventListener("load", function () {
		f();
		setInterval(f, 500);
	});
	addEventListener("resize", f);
})();