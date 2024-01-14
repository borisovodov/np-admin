// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default {
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Преобразуем полученный запрос в JSON-объект.
    const body = JSON.parse(JSON.stringify(await request.json()))

    try {
      let user = new User(body)

      // Получение сохранённого ранее стэйта.
      const state = await user.state(env, body)

      // Выясняем начинается ли стэйт с команды. Если нет, то нужна отписка.
      if (!isFirstMessageACommand(state)) {
        // Сами формируем что показать в ответном сообщении в Телеграме.
        let text = "Напишите всё же команду."

        // TODO: Вот тут нужно очищать состояние, что было записано.

        // Формируем содержимое ответа на запрос для Телеграма.
        let answer = prepareTelegramAnswer(body, text)

        // Формируем и возвращаем ответ на запрос.
        return getResponse(answer)
      }

      // Развёртываем стэйт.

      // Формируем и возвращаем ответ на запрос.
      // Черновиково получаем данные из БД.
      const allNewspapers = await Newspaper.all(env)

      // Черновиково получаем данные из ФХ.
      // https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
      const files = await Bucket.getFilesList(env)

      // Черновиково загружаем данные в файловое хранилище.
      await Bucket.uploadFile(env)

      // Сами формируем что показать в ответном сообщении в Телеграме.
      let text = prepareAnswerText(body, allNewspapers, files, state)

      // Формируем содержимое ответа на запрос для Телеграма.
      let answer = prepareTelegramAnswer(body, text)

      // Формируем и возвращаем ответ на запрос.
      return getResponse(answer)
    } catch(error) {
      // Формируем и возвращаем ответ на запрос с отказом.
      return getAuthFailureResponse(body, error)
    }
  },
};

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

class User {
  constructor(body) {
    const username = body.message.from.username

    if (User.#auth(username)) {
      this.username = username
    } else {
      throw new Error("userIsNotAdmin");
    }
  }

  async state(env, body) {
    // Получаем текущий стэйт, чтобы проверить, что он вообще есть.
    const currentState = await env.db.prepare("SELECT state FROM User WHERE username = ?").bind(this.username).all()

    // Если текущего стэйта нет (то есть не возвращается ни одного объекта), то создаём новую строку и наполняем её новым сообщением.
    if (currentState.results.length == 0) {
      await env.db.prepare("INSERT INTO User (username, state) VALUES (?, ?)").bind(this.username, body.message.text).run()
      return body.message.text
    }

    // Если стэйт есть, то возвращаем текущий стэйт + новое сообщение.
    const newState = currentState.results[0].state + "\t" + body.message.text
    await env.db.prepare("UPDATE User SET state = ? WHERE username = ?").bind(newState, this.username).run()
    return newState
  }

  static #auth(username) {
    // Определяем список юзернэймов, у кого будет доступ к боту.
    const admins = ["borisovodov"]

    return admins.includes(username)
  }
}

function isFirstMessageACommand(state) {
  const commands = ["/newspapers", "/languages", "/countries", "/cities", "/senders", 
  "/formatpapers", "/tags", "/currencies", "/addnewspaper", "/addlanguage", 
  "/addcountry", "/addcity", "/addsender", "/addformatpaper", "/addtag", "/addcurrency"]

  return commands.includes(state.split("\t")[0])
}

function prepareAnswerText(body, allNewspapers, files, state) {
  return {
    "username": body.message.from.username,
    "text": body.message.text,
    "results": allNewspapers,
    "files": files.objects,
    "state": state,
    "body": body,
  }
}

function prepareAnswerTextAuthFailure(error) {
  return "Чёт трабла какая-то: " + error
  //https://www.youtube.com/watch?v=tmozGmGoJuw
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

function getAuthFailureResponse(body, error) {
  // Готовим текст, чтобы послать нахер.
  let text = prepareAnswerTextAuthFailure()

  // Формируем сообщение с отклоненим для Телеграма.
  let answer = prepareTelegramAnswerAuthFailure(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}
