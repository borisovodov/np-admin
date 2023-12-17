// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default {
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Преобразуем полученный запрос в JSON-объект.
    const body = await getRequestBody(request)

    const authorization = auth(body)

    var allNewspapers
    var files

    if (authorization) {
      // Черновиково получаем данные из БД.
      allNewspapers = await getAllNewspapers(env)

      // Черновиково получаем данные из ФХ.
      // https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
      files = await getFilesList(env)

      // Черновиково загружаем данные в файловое хранилище.
      await uploadFile(env)
    }

    // Сами формируем что показать в ответном сообщении в Телеграме.
    let text = prepareAnswerText(body, authorization, allNewspapers, files)

    // Формируем содержимое ответа на запрос для Телеграма.
    let answer = prepareTelegramAnswer(body, text)

    // Формируем и возвращаем ответ на запрос.
    return getResponse(answer)
  },
};

async function getRequestBody(request) {
  return JSON.parse(JSON.stringify(await request.json()))
}

function auth(body) {
  // Определяем список юзернэймов, у кого будет доступ к боту.
  const admins = ["borisovodov"]

  return admins.includes(body.message.from.username)
}

async function getAllNewspapers(env) {
  return await env.db.prepare('SELECT * FROM newspaper').all()
}

async function getFilesList(env) {
  return await env.bucket.list()
}

async function uploadFile(env) {
  var key = "tratratra1.txt"
  var contents = "lalaland"
  var blob = new Blob([contents], { type: 'text/plain' })
  var file = new File([blob], key, {type: "text/plain"})
  await env.bucket.put(key, file)
}

function prepareAnswerText(body, auth, allNewspapers = [], files = null) {
  if (auth) {
    return {
      "username": body.message.from.username,
      "text": body.message.text,
      "results": allNewspapers,
      "files": files.objects,
      "auth": auth,
    }
  } else {
    return "https://www.youtube.com/watch?v=tmozGmGoJuw"
  }
}

function prepareTelegramAnswer(body, text) {
  return {
    "method":"sendMessage",
    "chat_id": body.message.chat.id,
    "reply_to_message_id": body.message.message_id,
    "text": JSON.stringify(text),
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
