// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default {
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Преобразуем полученный запрос в JSON-объект.
    const body = JSON.parse(JSON.stringify(await request.json()))

    if (auth(body)) {
      // Формируем и возвращаем ответ на запрос.
      return await getAuthSuccessResponse(env, body)
    } else {
      // Формируем и возвращаем ответ на запрос с отказом.
      return getAuthFailureResponse(body)
    }
  },
};

const commands = ["/newspapers", "/languages", "/countries", "/cities", "/senders", 
  "/formatpapers", "/tags", "/currencies", "/addnewspaper", "/addlanguage", 
  "/addcountry", "/addcity", "/addsender", "/addformatpaper", "/addtag", "/addcurrency"]

function auth(body) {
  // Определяем список юзернэймов, у кого будет доступ к боту.
  const admins = ["borisovodov"]

  return admins.includes(body.message.from.username)
}

class Bucket {
  static async getFilesList(env) {
    return await env.bucket.list()
  }

  static async uploadFile(env) {
    var key = "tratratra1.txt"
    var contents = "lalaland"
    var blob = new Blob([contents], { type: 'text/plain' })
    var file = new File([blob], key, {type: "text/plain"})
    await env.bucket.put(key, file)
  }
}

class Newspaper {
  static async all(env) {
    return await env.db.prepare('SELECT * FROM newspaper').all()
  }
}

function prepareAnswerText(body, allNewspapers, files) {
  return {
    "username": body.message.from.username,
    "text": body.message.text,
    "results": allNewspapers,
    "files": files.objects,
    "auth": auth,
    "body": body,
  }
}

function prepareAnswerTextAuthFailure() {
  return "https://www.youtube.com/watch?v=tmozGmGoJuw"
}

function prepareTelegramAnswer(body, text) {
  return {
    "method":"sendMessage",
    "chat_id": body.message.chat.id,
    "reply_to_message_id": body.message.message_id,
    "text": JSON.stringify(text),
  }
}

function prepareTelegramAnswerAuthFailure(body, text) {
  return {
    "method":"sendMessage",
    "chat_id": body.message.chat.id,
    "text": text,
  }
}

function getResponse(answer) {
  return new Response(
    JSON.stringify(answer), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
      status: 200
    })
}

async function getAuthSuccessResponse(env, body) {
  // Черновиково получаем данные из БД.
  const allNewspapers = await Newspaper.all(env)

  // Черновиково получаем данные из ФХ.
  // https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
  const files = await Bucket.getFilesList(env)

  // Черновиково загружаем данные в файловое хранилище.
  await Bucket.uploadFile(env)

  // Сами формируем что показать в ответном сообщении в Телеграме.
  let text = prepareAnswerText(body, allNewspapers, files)

  // Формируем содержимое ответа на запрос для Телеграма.
  let answer = prepareTelegramAnswer(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}

function getAuthFailureResponse(body) {
  // Готовим текст, чтобы послать нахер.
  let text = prepareAnswerTextAuthFailure()

  // Формируем сообщение с отклоненим для Телеграма.
  let answer = prepareTelegramAnswerAuthFailure(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}
