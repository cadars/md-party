// Utility methods
Vue.mixin({methods: {
    toPath:     str => str.replace(/[^a-z0-9]+/i, '_'),
    hashPage:   ()  => window.location.hash.substr(1), // 0: #
}})

// Let's get the party started!
new Vue({
    name: 'MDParty',
    el: '#app',

    template: `
        <p v-if="loading" id="message">Loading...</p>
        <div v-else id="md-party">

            <header v-if="layout.header" v-html="layout.header.html"></header>

            <nav>
                <span id="nav-title">{{ config.title }}</span>
                <ul>
                    <li
                        v-for="page in sitemap"
                        :key="page"
                        :href="'#' + toPath(page)"
                        :class="{active: toPath(page) === hashPage()}"
                    >
                        <a :href="'#' + toPath(page)">{{ page }}</a>
                    </li>
                </ul>
            </nav>

            <main v-if="pages[page]" v-html="pages[page].html"></main>
            <p v-else id="message">Page not found</p>

            <footer v-if="layout.footer" v-html="layout.footer.html"></footer>
        </div>
    `,

    data() { return {
        config: {},
        pages: {},
        sitemap: [],
        page: undefined,
        layout: {},
        loading: true,
    }},

    methods: {

        addCSSFile() {
            if (this.config.layout.css) {
                const path  = this.config.layout.css;
                const style = document.createElement('link');
                style.rel   = 'stylesheet';
                style.href  = this.config.layout.fetchPrefix + '/' + path;
                document.head.append(style);
            }
        },

        pathName(p) {
            return this.sitemap.find(n => this.toPath(n) === p);
        },

        syncPage() {
            this.page = this.pathName(this.hashPage()) || 'Not found';
            document.title = this.page + ' - ' + this.config.title;
        },

        loadConfigFile() {
            return fetch('config.json')
                .then(res => res.json())
        },

        loadSiteMap() {
            return fetch(this.config.pages.sitemapYaml)
                .then(res => res.text())
                .then(yaml => jsyaml.load(yaml));
        },

        // expects an array of {name, url}
        loadMarkdownResources(urls) {
            return Promise.all(urls.map(url => {
                return fetch(url.url)
                    .then(res => res.text())
                    .then(md => ({name: url.name, html: marked(md)}));
            }))
                .then(results => results.map(data => [data.name, data]))
                .then(pairs => Object.fromEntries(new Map(pairs)));
        },

        loadPages() {
            return this.loadMarkdownResources(this.sitemap.map(name => {
                const path  = '/' + this.toPath(name) + '.md';
                return {name: name, url: this.config.pages.fetchPrefix + path};
            }));
        },

        loadLayout() {
            return this.loadMarkdownResources(
                Object.keys(this.config.layout.parts).map(part => {
                    const path = '/' + this.config.layout.parts[part];
                    return {name: part, url: this.config.layout.fetchPrefix + path};
                })
            );
        },
    },

    async created() {
        this.config     = await this.loadConfigFile();
        this.sitemap    = await this.loadSiteMap();
        this.pages      = await this.loadPages();
        this.layout     = await this.loadLayout();
        this.addCSSFile();
        this.loading = false;

        // Set up "navigation"
        window.addEventListener('hashchange', this.syncPage);
        this.syncPage();

        // Go to home page (first page of the sitemap)
        if (! this.hashPage())
            window.location.hash = '#' + this.toPath(this.sitemap[0]);
    },
})
