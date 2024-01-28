// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default { //<ExportedHandler>{
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Преобразуем полученный запрос в JSON-объект.
    const body = JSON.parse(JSON.stringify(await request.json()))

    try {
      const user = new User(body)
      const state = new State()
      await state.update(env, body, user)

      let text
      let answer

      // Собственно работаем со стэйтом. Проверяем первую команду.
      switch (state.current[0]) {
      case "/addlanguage":
        // Понять на каком этапе создания языка мы находимся.
        switch (state.current.length) {
        case 1:
          // Пишем просьбу о названии языка.
          text = "Напишите пожалуйста название создаваемого языка."
          answer = prepareTelegramAnswer(body, text)
          return getResponse(answer)
        case 2:
          // Проверяем название языка.
          // Пишем просьбу о количестве носителей языка.
          text = "Напишите пожалуйста количество носителей создаваемого языка."
          answer = prepareTelegramAnswer(body, text)
          return getResponse(answer)
        case 3:
          // Проверяем количество носителей языка.
          // Создаём язык.
          const language = new Language(state)
          await language.save(env)
          // Пишем радостное сообщение о том, какой язык мы создали.
          text = "Ура! Был создан язык: " + language.name
          answer = prepareTelegramAnswer(body, text)
          // Сбрасываем стэйт.
          state.reset(env, user)
          // Отправляем сообщение.
          return getResponse(answer)
        }
        break
      case "/addcountry":
        break
      case "/addcity":
        break
      case "/addsender":
        break
      case "/addformatpaper":
        break
      case "/addtag":
        break
      case "/addnewspaper":
        break
      case "/addcurrency":
        break
      case "/newspapers":
        break
      case "/languages":
        break
      case "/countries":
        break
      case "/cities":
        break
      case "/senders":
        break
      case "/formatpapers":
        break
      case "/tags":
        break
      case "/currencies":
        break
      default:
        return await getFirstMessageIsNotCommandResponse(env, body, user, state)
      }

      /*
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
      */
    } catch(error) {
      // TODO: здесь нужно пробрасывать разные ответы в зависимости от сути ошибки. Не все ошибки — про аутентификацию.
      // Формируем и возвращаем ответ на запрос с отказом.
      return getAuthFailureResponse(body, error)
    }
  }
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

class Language {
  id: string
  name: string
  population: number

  constructor(state) {
    //this.id = new Crypto().randomUUID()
    this.id = crypto.randomUUID()
    this.name = state[1]
    this.population = parseInt(state[2])
  }

  async save(env) {
    await env.db.prepare("INSERT INTO Language (id, name, population) VALUES (?, ?, ?)").bind(this.id, this.name, this.population).run()
  }
}

class User {
  username: string

  constructor(body) {
    const username = body.message.from.username

    if (User.#auth(username)) {
      this.username = username
    } else {
      throw new Error("userIsNotAdmin");
    }
  }

  static #auth(username) {
    // Определяем список юзернэймов, у кого будет доступ к боту.
    const admins = ["borisovodov"]

    return admins.includes(username)
  }
}

class State {
  current: string[]

  constructor() {
    this.current = []
  }

  async update(env, body, user) {
    // Получаем текущий стэйт, чтобы проверить, что он вообще есть.
    const currentState = await env.db.prepare("SELECT state FROM User WHERE username = ?").bind(user.username).all()

    // Если текущего стэйта нет (то есть не возвращается ни одного объекта), то создаём новую строку и наполняем её новым сообщением.
    if (currentState.results.length == 0) {
      await env.db.prepare("INSERT INTO User (username, state) VALUES (?, ?)").bind(user.username, body.message.text).run()
      this.current = [body.message.text]
    } else {
      // Если стэйт есть, то возвращаем текущий стэйт + новое сообщение.
      const newState = currentState.results[0].state + "\t" + body.message.text
      await env.db.prepare("UPDATE User SET state = ? WHERE username = ?").bind(newState, user.username).run()
      this.current = newState.split("\t")
    }
  }

  async reset(env, user) {
    // Удаляем из БД.
    await env.db.prepare("DELETE FROM User WHERE username = ?").bind(user.username).run()

    // Очистить свойство.
    this.current = []
  }
}

function prepareAnswerText(body, allNewspapers, files, state) {
  return {
    "username": body.message.from.username,
    "text": body.message.text,
    "results": allNewspapers,
    "files": files.objects,
    "state": state.current,
    "body": body,
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

async function getFirstMessageIsNotCommandResponse(env, body, user, state) {
  // Сами формируем что показать в ответном сообщении в Телеграме.
  const text = "Напишите всё же команду."

  // Очищаем состояние, что было записано. То есть сбросываем стэйт.
  await state.reset(env, user)

  // Формируем содержимое ответа на запрос для Телеграма.
  const answer = prepareTelegramAnswer(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}

function getAuthFailureResponse(body, error) {
  // Готовим текст, чтобы послать нахер.
  const text = "Чёт трабла какая-то: " + error

  // Формируем содержимое ответа на запрос для Телеграма.
  const answer = prepareTelegramAnswer(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}
