let gamesDataset = [];
// ---------- Categories ----------
// Edit this list to add, remove or rename categories.
// "slug" must match the "category" value used in games.json.
const CATEGORIES = [
    { slug: 'action',      label: 'Action' },
    { slug: 'arcade',      label: 'Arcade' },
    { slug: 'racing',      label: 'Racing' },
    { slug: 'shooting',    label: 'Shooting' },
    { slug: 'sports',      label: 'Sports' },
    { slug: 'puzzle',      label: 'Puzzle' },
    { slug: 'multiplayer', label: 'Multiplayer' },
    { slug: 'casual',      label: 'Casual' }
];

// <body data-page="categories"> turns on the category page layout
const IS_CATEGORY_PAGE = document.body.dataset.page === 'categories';
const IS_PLAY_PAGE = document.body.dataset.page === 'play';

const PILL_BASE = 'px-5 h-11 rounded-full border font-bebas text-[19px] leading-none tracking-wide uppercase whitespace-nowrap flex items-center transition-colors';
const PILL_IDLE = 'border-white/15 bg-white/[0.04] text-white hover:bg-white/10';
const PILL_ON   = 'border-pz-accent bg-pz-accent text-pz-bg';

function categoryUrl(slug) {
    return slug === 'all' ? 'categories.html' : 'categories.html?c=' + slug;
}

// /categories?c=action  ->  'action'
function getInitialCategory() {
    if (!IS_CATEGORY_PAGE) return 'all';
    const slug = (new URLSearchParams(location.search).get('c') || '').toLowerCase();
    return CATEGORIES.some(c => c.slug === slug) ? slug : 'all';
}

let activeCategory = getInitialCategory();
let searchQuery = '';
let userSessionState = { isLoggedIn: false };
let playbackSessionHistory = [1, 2];

window.addEventListener('DOMContentLoaded', () => {
    initPage();
    setupSearchBehaviour();
    layoutGrid();
    fetchGamesCatalog();
    window.addEventListener('scroll', handleWindowScroll);

    // Press "/" to jump to the search box
    window.addEventListener('keydown', (e) => {
        const tag = (document.activeElement || {}).tagName;
        if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('gameSearch').focus();
        }
    });

    // Recalculate the grid whenever the available width changes.
    // Only re-render the tiles if the column count actually changed.
    new ResizeObserver(() => {
        const changed = layoutGrid();
        if (changed && gamesDataset.length) renderGrid();
    }).observe(document.querySelector('main'));
});

function initPage() {
    // Categories dropdown in the nav (real links; on the categories page they switch in place)
    const list = document.getElementById('catDropdownList');
    list.innerHTML = CATEGORIES.map(c => `
        <a href="${categoryUrl(c.slug)}"
           data-cat-link="${c.slug}"
           onclick="return navToCategory(event, '${c.slug}')"
           class="block w-full px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-pz-accent transition-colors">
            ${c.label}
        </a>`).join('');

    if (!IS_CATEGORY_PAGE) return;

    // Category page layout: pill bar + big uniform tiles, no FAQ block
    const main = document.getElementById('mainEl');
    main.classList.remove('px-8');
    main.classList.add('category-main');
    document.getElementById('gamesContainer').className = 'uniform-grid';
    document.getElementById('infoSection').classList.add('hidden');

    const bar = document.getElementById('categoryBar');
    bar.innerHTML =
        [{ slug: 'all', label: 'All' }, ...CATEGORIES].map(c =>
            `<button type="button" data-pill="${c.slug}" onclick="selectCategory('${c.slug}')" class="${PILL_BASE} ${PILL_IDLE}">${c.label}</button>`
        ).join('') +
        `<span id="categoryCount" class="ml-auto pl-4 font-bebas text-lg tracking-wider text-pz-muted whitespace-nowrap"></span>`;
    bar.classList.remove('hidden');
    bar.classList.add('flex');

    updateCategoryUI();
}

// Highlight the active pill / dropdown item and update the tab title
function updateCategoryUI() {
    document.querySelectorAll('[data-pill]').forEach(btn => {
        const on = btn.dataset.pill === activeCategory;
        btn.className = PILL_BASE + ' ' + (on ? PILL_ON : PILL_IDLE);
    });

    document.querySelectorAll('[data-cat-link]').forEach(a => {
        const on = a.dataset.catLink === activeCategory;
        a.classList.toggle('text-pz-accent', on);
        a.classList.toggle('text-white/80', !on);
    });

    const cat = CATEGORIES.find(c => c.slug === activeCategory);
    document.title = cat
        ? `${cat.label} Games - Pizza Edition 2`
        : 'Categories - Pizza Edition 2';
}

// Switch category without reloading, keeping the URL shareable (?c=action)
function selectCategory(slug) {
    activeCategory = slug;
    updateCategoryUI();

    try {
        history.replaceState(null, '', slug === 'all' ? location.pathname : location.pathname + '?c=' + slug);
    } catch (e) { /* ignore (e.g. file://) */ }

    renderGrid();
}

// Dropdown link click: switch in place on the categories page, normal link elsewhere
function navToCategory(event, slug) {
    if (!IS_CATEGORY_PAGE) return true;
    event.preventDefault();
    selectCategory(slug);
    if (document.activeElement) document.activeElement.blur();
    return false;
}

// Stable pseudo-random sizes: ~72% small, ~20% 2x2, ~8% 3x3
function pickSize(i) {
    const r = (Math.imul(i + 1, 2654435761) >>> 0) % 100;
    if (r < 8) return 3;
    if (r < 28) return 2;
    return 1;
}

// Keep tiles square and fill the full width.
// Returns true if the column count changed.
function layoutGrid() {
    if (IS_CATEGORY_PAGE || IS_PLAY_PAGE) return false;   // those layouts size themselves with CSS

    const grid = document.getElementById('gamesContainer');
    const main = document.querySelector('main');
    const gap = 16;
    const base = 94;

    const cs = getComputedStyle(main);
    const width =
        main.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight);

    const cols = Math.max(2, Math.floor((width + gap) / (base + gap)));
    const unit = (width - gap * (cols - 1)) / cols;

    const changed = String(cols) !== grid.dataset.cols;

    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--unit', unit + 'px');
    grid.dataset.cols = cols;

    return changed;
}

async function fetchGamesCatalog() {
    const container = document.getElementById('gamesContainer');

    try {
        const response = await fetch('games.json');

        if (!response.ok) {
            throw new Error(`HTTP status verification error: ${response.status}`);
        }

        const data = await response.json();

        gamesDataset = data.map((game, index) => ({
            id: game.id || (index + 1),
            name: game.name || "Unknown Game",
            img: game.img || "https://placehold.co/150x150/1e1e1e/ffffff?text=Game",
            url: game.url || "#",
            category: game.category || deduceCategoryByName(game.name),
            isHot: game.isHot !== undefined ? game.isHot : (index % 7 === 0),
            size: game.size || pickSize(index),
            author: game.author || ''
        }));

        document.getElementById('gameSearch').placeholder =
            `Search ${Math.floor(gamesDataset.length / 10) * 10}+ games`;

        if (IS_PLAY_PAGE) {
            await loadPartners();
            renderPlayPage();
        } else {
            renderGrid();
        }

    } catch (error) {
        console.error(
            "Critical failure during catalog loading operational sequence:",
            error
        );

        container.innerHTML = `
            <div class="col-span-full py-16 text-center text-pz-hot border border-pz-hot/20 bg-pz-hot/5 rounded-2xl p-6">
                <svg class="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>

                <h4 class="font-bold text-lg text-white mb-1">
                    Failed to load games.json database configuration
                </h4>

                <p class="text-sm text-pz-muted max-w-sm mx-auto">
                    Ensure 'games.json' resides in the same root directory as index.html and is accurately structured as a valid JSON file array.
                </p>
            </div>
        `;
    }
}

function deduceCategoryByName(name) {
    const lower = name.toLowerCase();

    if (
        lower.includes('slope') ||
        lower.includes('escape') ||
        lower.includes('drift') ||
        lower.includes('ride') ||
        lower.includes('drive') ||
        lower.includes('track')
    ) return 'racing';

    if (
        lower.includes('btd') ||
        lower.includes('maze') ||
        lower.includes('blast')
    ) return 'puzzle';

    if (
        lower.includes('bowl') ||
        lower.includes('random') ||
        lower.includes('star')
    ) return 'sports';

    if (
        lower.includes('io') ||
        lower.includes('1v1')
    ) return 'multiplayer';

    if (
        lower.includes('archer') ||
        lower.includes('gun') 
    ) return 'shooting';

    if (
        lower.includes('tetris') 
    ) return 'arcade';

    if (
        lower.includes('surf') ||
        lower.includes('run') ||
        lower.includes('hook') ||
        lower.includes('ninja') ||
        lower.includes('hot')
    ) return 'action';

    return 'casual';
}

function renderGrid() {
    if (IS_PLAY_PAGE || gamesDataset.length === 0) return;

    const container = document.getElementById('gamesContainer');
    const noResults = document.getElementById('noResultsSection');

    container.innerHTML = '';

    const processedList = gamesDataset.filter(game => {
        const matchCat =
            activeCategory === 'all' ||
            game.category === activeCategory;

        const matchSearch =
            game.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

        return matchCat && matchSearch;
    });

    const countEl = document.getElementById('categoryCount');
    if (countEl) countEl.textContent = processedList.length + ' GAMES';

    if (processedList.length === 0) {
        container.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    noResults.classList.add('hidden');

    // Make sure unit/cols are correct (grid may have been hidden before)
    layoutGrid();

    const cols = parseInt(container.dataset.cols || 12);

    processedList.forEach(game => {

        let size = game.size;
        if (cols < 6) size = Math.min(size, 2);   // don't let a 3x3 overflow narrow screens
        if (cols < 4) size = 1;
        if (IS_CATEGORY_PAGE) size = 2;   // big-tile hover styling

        const tileAnchor = document.createElement('a');

        tileAnchor.href = playUrl(game);

        tileAnchor.className =
            `game-card relative overflow-hidden bg-pz-panel2 border border-white/5 rounded-2xl group cursor-pointer ${IS_CATEGORY_PAGE ? '' : size === 3 ? 'tile-3' : size === 2 ? 'tile-2' : ''}`;

        const hotBadgeMarkup = game.isHot ? `
            <div class="tile-badge ${size === 1 ? 'badge-small' : ''} bg-pz-accent text-pz-bg font-extrabold text-[10px] tracking-widest uppercase">
                HOT
            </div>
        ` : '';

        // Hide the category label on tiny tiles so the overlay isn't cramped
        const categoryMarkup = size === 1 ? '' : `
                <span class="text-[11px] text-pz-accent uppercase tracking-widest mt-0.5">
                    ${game.category}
                </span>
        `;

        tileAnchor.innerHTML = `
            ${hotBadgeMarkup}

            <img
                src="${game.img}"
                alt="${game.name}"
                class="w-full h-full object-cover rounded-2xl transform group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onerror="this.src='https://placehold.co/150x150/1f1f1f/ffffff?text=${encodeURIComponent(game.name)}'"
            >

            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end ${size === 1 ? 'p-1.5' : 'p-3'} text-center pointer-events-none">
                <span class="${size === 1 ? 'text-[10px]' : 'text-sm'} font-bold text-white truncate drop-shadow-md">
                    ${game.name}
                </span>

                ${categoryMarkup}
            </div>
        `;

        tileAnchor.addEventListener('click', () => {
            registerHistoryPlayback(game.id);
        });

        container.appendChild(tileAnchor);
    });
}

// Footer buttons call this
function filterCategory(catName) {
    if (IS_CATEGORY_PAGE) {
        selectCategory(catName);
        scrollToTop();
    } else {
        window.location.href = categoryUrl(catName);
    }
}

function handleSearch(val) {
    searchQuery = val.trim();

    const clearBtn =
        document.getElementById('searchClearBtn');

    const kbd = document.getElementById('searchKbd');

    if (searchQuery.length > 0) {
        clearBtn.classList.remove('hidden');
        clearBtn.classList.add('flex');
        kbd.classList.add('hidden');
    } else {
        clearBtn.classList.remove('flex');
        clearBtn.classList.add('hidden');
        kbd.classList.remove('hidden');
    }

    renderGrid();
}

function clearSearch() {
    const searchInput =
        document.getElementById('gameSearch');

    searchInput.value = '';
    searchQuery = '';

    document
        .getElementById('searchClearBtn')
        .classList.add('hidden');

    document.getElementById('searchKbd').classList.remove('hidden');

    renderGrid();
}

function toggleAccountSidebar() {
    const side =
        document.getElementById('accountSidebar');

    const scrim =
        document.getElementById('accountScrim');

    if (side.classList.contains('translate-x-full')) {

        side.classList.remove('translate-x-full');

        scrim.classList.remove(
            'opacity-0',
            'pointer-events-none'
        );

    } else {

        side.classList.add('translate-x-full');

        scrim.classList.add(
            'opacity-0',
            'pointer-events-none'
        );
    }
}

function simulateLogin() {
    userSessionState.isLoggedIn = true;

    document
        .getElementById('profileSignedOut')
        .classList.add('hidden');

    document
        .getElementById('profileSignedIn')
        .classList.remove('hidden');

    document
        .getElementById('sidebarAccountActions')
        .classList.remove('hidden');

    document
        .getElementById('onlineIndicator')
        .classList.remove('hidden');

    document
        .getElementById('profileNavBtn')
        .classList.add('border-pz-accent');

    renderHistoryView();
}

function simulateLogout() {
    userSessionState.isLoggedIn = false;

    document
        .getElementById('profileSignedIn')
        .classList.add('hidden');

    document
        .getElementById('profileSignedOut')
        .classList.remove('hidden');

    document
        .getElementById('sidebarAccountActions')
        .classList.add('hidden');

    document
        .getElementById('onlineIndicator')
        .classList.add('hidden');

    document
        .getElementById('profileNavBtn')
        .classList.remove('border-pz-accent');
}

function registerHistoryPlayback(id) {

    if (!playbackSessionHistory.includes(id)) {

        playbackSessionHistory.unshift(id);

        if (playbackSessionHistory.length > 4) {
            playbackSessionHistory.pop();
        }
    }

    if (userSessionState.isLoggedIn) {
        renderHistoryView();
    }
}

function renderHistoryView() {
    const container =
        document.getElementById('recentHistoryList');

    container.innerHTML = '';

    playbackSessionHistory.forEach(id => {

        const gameMatch =
            gamesDataset.find(g => g.id === id);

        if (!gameMatch) return;

        const row = document.createElement('div');

        row.className =
            "flex items-center gap-3 bg-neutral-900/60 p-2 rounded-xl border border-white/5 hover:border-white/10 transition-colors";

        row.innerHTML = `
            <img
                src="${gameMatch.img}"
                alt="${gameMatch.name}"
                class="w-10 h-10 object-cover rounded-lg"
                onerror="this.src='https://placehold.co/40x40/1f1f1f/ffffff?text=G'"
            >

            <div class="min-w-0 flex-1">
                <span class="text-xs font-bold text-white block truncate">
                    ${gameMatch.name}
                </span>

                <span class="text-[10px] text-pz-muted uppercase tracking-wider block">
                    ${gameMatch.category}
                </span>
            </div>

            <span class="text-[11px] text-pz-accent font-semibold px-2 py-0.5 bg-pz-accent/5 rounded border border-pz-accent/10">
                Sync'd
            </span>
        `;

        container.appendChild(row);
    });
}

function toggleFaq(btn) {

    const body = btn.nextElementSibling;
    const marker = btn.querySelector('span:last-child');
    const parent = btn.parentElement;

    if (
        body.style.maxHeight &&
        body.style.maxHeight !== '0px'
    ) {

        body.style.maxHeight = '0px';
        marker.style.transform = 'none';

        parent.classList.remove(
            'border-pz-accent/50'
        );

    } else {

        document
            .querySelectorAll('#faqAccordionGroup > div')
            .forEach(item => {

                item.querySelector('div').style.maxHeight =
                    '0px';

                item.querySelector(
                    'button span:last-child'
                ).style.transform = 'none';

                item.classList.remove(
                    'border-pz-accent/50'
                );
            });

        body.style.maxHeight =
            body.scrollHeight + 'px';

        marker.style.transform =
            'rotate(45deg)';

        parent.classList.add(
            'border-pz-accent/50'
        );
    }
}

function triggerRandomGame() {
    if (gamesDataset.length === 0) return;

    let pool = activeCategory !== 'all'
        ? gamesDataset.filter(g => g.category === activeCategory)
        : gamesDataset;

    // don't "randomly" pick the game that's already open
    pool = pool.filter(g => String(g.id) !== String(currentGameId));
    if (pool.length === 0) return;

    window.location.href = playUrl(pool[Math.floor(Math.random() * pool.length)]);
}

function handleWindowScroll() {

    const btn =
        document.getElementById('backToTopBtn');

    if (window.scrollY > 400) {

        btn.classList.remove(
            'opacity-0',
            'pointer-events-none',
            'translate-y-4'
        );

    } else {

        btn.classList.add(
            'opacity-0',
            'pointer-events-none',
            'translate-y-4'
        );
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


// ---------- Search behaviour ----------
function setupSearchBehaviour() {
    const input = document.getElementById('gameSearch');

    // Game page: Enter sends the search to the home page results
    if (IS_PLAY_PAGE) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                window.location.href = 'index.html?q=' + encodeURIComponent(input.value.trim());
            }
        });
        return;
    }

    // Home / categories: support /?q=term
    const q = new URLSearchParams(location.search).get('q');
    if (q) {
        input.value = q;
        handleSearch(q);
    }
}

// ---------- Game player page ----------
let currentGameId = null;

function playUrl(game) {
    return 'play.html?id=' + encodeURIComponent(game.id);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

// Small square thumbnail that links to a game's page.
// fill = true  -> stretches to the grid row height (used in the side mosaic)
function miniTile(game, extraClass = '', fill = false) {
    const name = escapeHtml(game.name);
    return `
        <a href="${playUrl(game)}" title="${name}"
           class="game-card group relative block overflow-hidden rounded-xl bg-pz-panel2 ${fill ? 'h-full' : 'aspect-square'} ${extraClass}">
            <img src="${game.img}" alt="${name}" loading="lazy"
                 class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                 onerror="this.src='https://placehold.co/150x150/1f1f1f/ffffff?text=${encodeURIComponent(game.name)}'">
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pt-6 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <span class="block text-[11px] font-bold text-white text-center truncate">${name}</span>
            </div>
        </a>`;
}

function renderPlayPage() {
    const root = document.getElementById('playRoot');
    const id = new URLSearchParams(location.search).get('id');
    const game = gamesDataset.find(g => String(g.id) === String(id));

    if (!game) {
        root.innerHTML = `
            <div class="py-24 text-center max-w-md mx-auto space-y-4">
                <h1 class="font-bebas text-4xl text-white tracking-wide">Game not found</h1>
                <p class="text-sm text-pz-muted">That game doesn't exist (or was removed).</p>
                <a href="index.html" class="inline-flex items-center px-5 h-10 bg-pz-accent text-pz-bg rounded-xl text-sm font-bold">Back to all games</a>
            </div>`;
        return;
    }

    currentGameId = game.id;
    document.title = `${game.name} - Pizza Edition 2`;
    registerHistoryPlayback(game.id);

    // Related games: same category first, then everything else
    const others = gamesDataset.filter(g => g.id !== game.id);
    const related = [
        ...others.filter(g => g.category === game.category),
        ...others.filter(g => g.category !== game.category)
    ];

    // Left column = 14 slots (2 x 7). Partner sites (partners.json) come first,
    // and regular games fill every slot that's left over.
    const LEFT_SLOTS = 14;
    const adLeft = pickPartners(LEFT_SLOTS, 0);
    const partnerCells = adLeft.length + (adLeft.length % 2);   // odd last card spans 2 cells
    const leftGames = related.slice(0, LEFT_SLOTS - partnerCells);

    // Real games beside the player: fills all 6 rows next to the player
    const RIGHT = 15;
    const right = related.slice(leftGames.length, leftGames.length + RIGHT);

    // Bottom grid: everything not already shown in the side columns on wide screens
    const shownInSides = leftGames.length + RIGHT;
    const moreTiles = related.map((g, i) => miniTile(g, i < shownInSides ? 'more-hide-xl' : ''));

    const name = escapeHtml(game.name);
    const byLine = game.author ? 'BY: ' + escapeHtml(game.author) : escapeHtml(game.category);

    const stage = game.url && game.url !== '#'
        ? `<iframe id="playerFrame" src="${game.url}" title="${name}"
                   class="absolute inset-0 w-full h-full border-0"
                   allow="autoplay; fullscreen; gamepad; clipboard-write" allowfullscreen></iframe>`
        : `<div class="absolute inset-0 flex items-center justify-center text-center p-6 text-pz-muted">
               <p>This game doesn't have a URL yet.<br>Add one in <code class="text-pz-accent">games.json</code>.</p>
           </div>`;

    root.innerHTML = `
        <div class="play-layout">
            <div class="side-left">
                ${adLeft.length ? `
                    <div class="ad-grid-2">
                        ${adLeft.map((p, i) => partnerTile(p, (adLeft.length % 2 && i === adLeft.length - 1) ? 'partner-wide' : '')).join('')}
                    </div>
                    <p class="ad-label">${AD_LABEL}</p>` : ''}
                <div class="ad-grid-2 ${adLeft.length ? 'mt-3' : ''}">
                    ${leftGames.map(g => miniTile(g)).join('')}
                </div>
            </div>

            <div class="min-w-0">
                <div class="rounded-2xl border-2 border-pz-accent overflow-hidden bg-black">
                    <div id="playerStage" class="relative bg-black" style="aspect-ratio: 924 / 560;">
                        ${stage}
                    </div>

                    <div class="flex items-center gap-3 bg-pz-panel px-4 h-[78px]">
                        <img src="${game.img}" alt="" class="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                             onerror="this.src='https://placehold.co/44x44/1f1f1f/ffffff?text=G'">

                        <div class="min-w-0 flex-1">
                            <h1 class="font-bebas text-2xl leading-none tracking-wide text-white truncate">${name}</h1>
                            <p class="font-bebas text-sm tracking-wide text-pz-muted mt-1 uppercase truncate">${byLine}</p>
                        </div>

                        <button id="voteUp" onclick="castVote('up')" title="Like"
                                class="w-11 h-11 rounded-xl text-white hover:bg-white/10 flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.3l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                        </button>

                        <button id="voteDown" onclick="castVote('down')" title="Dislike"
                                class="w-11 h-11 rounded-xl text-white hover:bg-white/10 flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.3l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                        </button>

                        <button onclick="toggleFullscreen()" title="Fullscreen"
                                class="w-11 h-11 rounded-xl text-white hover:bg-white/10 flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div class="side-right">
                <div class="mosaic-right">
                    ${right.map((g, i) => miniTile(g, i === 0 ? 'span-2' : '', true)).join('')}
                </div>
            </div>
        </div>

        <!-- Everything else. Items already shown in the side columns are hidden on wide screens. -->
        <div class="more-grid mt-6">
            ${moreTiles.join('')}
        </div>`;

    updateVoteButtons();
}

function toggleFullscreen() {
    const stage = document.getElementById('playerStage');
    if (!stage) return;

    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (stage.requestFullscreen) {
        stage.requestFullscreen();
    }
}

// Like / dislike are remembered in this browser only (there's no server to count them)
function getVotes() {
    try { return JSON.parse(localStorage.getItem('pz_votes') || '{}'); }
    catch (e) { return {}; }
}

function castVote(kind) {
    const votes = getVotes();
    if (votes[currentGameId] === kind) delete votes[currentGameId];
    else votes[currentGameId] = kind;

    try { localStorage.setItem('pz_votes', JSON.stringify(votes)); } catch (e) { /* storage unavailable */ }
    updateVoteButtons();
}

function updateVoteButtons() {
    const vote = getVotes()[currentGameId];
    const up = document.getElementById('voteUp');
    const down = document.getElementById('voteDown');
    if (!up || !down) return;

    up.classList.toggle('text-pz-accent', vote === 'up');
    up.classList.toggle('text-white', vote !== 'up');
    down.classList.toggle('text-pz-hot', vote === 'down');
    down.classList.toggle('text-white', vote !== 'down');
}


// ---------- Partner sites (free cross-promotion) ----------
// Tiles that link out to other game SITES (their homepage, not a specific game).
// Add them in partners.json:
//   { "name": "Their Site", "url": "https://theirsite.com", "img": "partners/theirsite.png" }
const AD_LABEL = 'Partner sites';
let partnersData = [];

async function loadPartners() {
    try {
        const res = await fetch('partners.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const list = await res.json();

        // keep only complete entries, then shuffle so every partner gets shown over time
        const valid = list.filter(p => p && p.url && p.img);
        for (let i = valid.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [valid[i], valid[j]] = [valid[j], valid[i]];
        }
        partnersData = valid;
    } catch (e) {
        partnersData = [];   // no partners.json -> no partner slots
    }
}

// Up to n partners, starting at an offset so different slots show different partners
function pickPartners(n, offset) {
    const len = partnersData.length;
    const count = Math.min(n, len);
    const out = [];
    for (let i = 0; i < count; i++) out.push(partnersData[(offset + i) % len]);
    return out;
}

// Only allow normal web links
function safeUrl(url) {
    return /^https?:\/\//i.test(url) ? url : '#';
}

function partnerTile(p, extraClass = '') {
    const label = p.name || p.site || 'Partner site';
    const name = escapeHtml(label);

    return `
        <a href="${escapeHtml(safeUrl(p.url))}" target="_blank" rel="noopener noreferrer"
           title="${name}" class="partner-tile partner-card ${extraClass}">
            <img src="${escapeHtml(p.img)}" alt="${name}" loading="lazy"
                 onerror="this.src='https://placehold.co/150x150/1f1f1f/ffffff?text=${encodeURIComponent(label)}'">
            <span class="partner-name">${name}</span>
            <svg class="partner-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
        </a>`;
}