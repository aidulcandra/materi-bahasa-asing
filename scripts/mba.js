const materiBahasaAsing = {
	cache: {},
	endpoint: "https://github.com/aidulcandra/materi-bahasa-asing/raw/main/",
	getLanguages: async function () {
		const languages = this.languages ??= await fetchJson(this.endpoint + "info.json")
			.then(d => d.languages)
		return languages
	},
	languageExists: async function (code) {
		const languages = await this.getLanguages()
		return languages.some(l => l.code === code)
	},
	getList: async function (code) {
		code = code?.toLowerCase()
		if (!code) return { error: "code is required" }
		if (!await this.languageExists(code)) return { error: "language unavailable" }
		this.list ??= {}
		const list = this.list[code] ??= await fetchJson(this.endpoint + `${code}/list.json`)
		return list
	},
	getMaterial: async function (code, id) {
		const list = await this.getList(code)
		const material = list[id]
		if (!material) return { error: "id invalid" }
		const url = this.endpoint + `${code.toLowerCase()}/files/${material.link}`
		console.log({url})
		const content = this.cache[url] ??= await fetchText(url)
		console.log({content})
		material.content ??= content
		return material
	},
	search: async function (code, keyword) {
		const similarity = require("similarity")
		const list = await this.getList(code).then(l => JSON.parse(JSON.stringify(l)))
		list.forEach((m,i) => m.id = i)
		const filtered = list.filter(m => m.title.toLowerCase().split(" ").concat(...m.tags).some(word => keyword.toLowerCase().split(" ").some(kw => similarity(kw, word) >= 0.8)))
		return filtered
	},
	random: async function (code) {
		const list = await this.getList(code)
		const id = Math.floor(Math.random()*list.length)
		const material = await this.getMaterial(code, id)
		return material
	}
}
