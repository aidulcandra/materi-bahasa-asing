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
		if (!code) throw new Error("code required")
		if (!await this.languageExists(code)) throw new Error("code invalid")
		this.list ??= {}
		const list = this.list[code] ??= await fetchJson(this.endpoint + `${code}/list.json`)
		return list
	},
	getMaterial: async function (code, id) {
		const list = await this.getList(code)
		const material = list[id]
		if (!material) throw new Error("id invalid")
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
	},
	add: async function (mbaToken, code, title, tags, content) {
		if (!mbaToken) throw new Error("mbaToken required")
		const list = await this.getList(code)
		if (!title) throw new Error("title required")
		if (tags && !tags instanceof Array) throw new Error("tags must be an array")
		if (!content) throw new Error("content required")

		title = ""+title
		const link = title.toLowerCase().replace(/ {2,}/g," ").replace(/[^\w ]/g,"").replace(/ /g,"-") + ".txt"
		if (list.find(m=>m.title==title || m.link==link)) throw new Error("title already exists")

		content = ""+content
		const newMaterial = { title, tags: tags||[], link }
		const makeHeaders = accept => ({ "Accept": accept, "Authorization": `Bearer ${mbaToken}` })
		const apiUrl = "https://api.github.com/repos/aidulcandra/materi-bahasa-asing/contents/"
		const get = (path) => fetch(apiUrl + path, {headers: makeHeaders("application/vnd.github.object")}).then(r=>r.json())
		const upload = (path, message, data, sha) => fetch(apiUrl + path, { method: "PUT", headers: makeHeaders("application/vnd.github+json"),
			body: JSON.stringify({
				message,
				content: Buffer.from(data).toString("base64"),
				sha
			})
		})

		let status
		let response = await upload(`${code}/files/${link}`, `Add new ${code} material: ${link}`, content).then(r => (status = r.status, r.json()))
		
		if (status != 201) return { status, response }

		// Update List
		list.push(newMaterial)
		await new Promise(r => setTimeout(r,1000))
		const { sha } = await get(`${code}/list.json`)
		await new Promise(r => setTimeout(r,1000))
		response = await upload(`${code}/list.json`, "Update list.json", JSON.stringify(list,null,2), sha).then(r => (status = r.status, r.json()))
		if (status != 200) return { status, response }

		return { status }
	}
}
