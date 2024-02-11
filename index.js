// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default {
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Преобразуем полученный запрос в JSON-объект.
    const body = JSON.parse(JSON.stringify(await request.json()))

    let user
    let state

    try {
      user = new User(body)
    } catch(error) {
      // Формируем и возвращаем ответ на запрос с отказом.
      return getAuthFailureResponse(body, error)
    }

    try {
      state = new State()
      await state.update(env, body, user)
    } catch(error) {
      await state.reset(env, user)
      return getExceptionResponse(body, error)
    }

    // Собственно работаем со стэйтом. Проверяем первую команду.
    switch (state.current[0]) {
    case "/addlanguage":
      return await Language.creating(env, body, user, state)
    case "/addcountry":
      return await Country.creating(env, body, user, state)
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

    // Сами формируем что показать в ответном сообщении в Телеграме.
    let text = prepareAnswerText(body, allNewspapers, files, state)

    // Формируем содержимое ответа на запрос для Телеграма.
    let answer = prepareTelegramAnswer(body, text)

    // Формируем и возвращаем ответ на запрос.
    return getResponse(answer)
    */
  },
};

class Bucket {
  static async getFilesList(env) {
    return await env.bucket.list()
  }

  /*
  static async uploadFile(env) {
    var key = "tratratra1.txt"
    var contents = "lalaland"
    var blob = new Blob([contents], { type: 'text/plain' })
    var file = new File([blob], key, {type: "text/plain"})
    await env.bucket.put(key, file)
  }
  */

  static async uploadFile(env, key, file) {
    await env.bucket.put(key, file)
  }
}

class Newspaper {
  static async all(env) {
    return await env.db.prepare('SELECT * FROM newspaper').all()
  }
}

class Language {
  constructor(state) {
    this.id = crypto.randomUUID()
    this.name = state.current[1]
    this.population = parseInt(state.current[2])
  }

  async save(env) {
    await env.db.prepare("INSERT INTO Language (id, name, population) VALUES (?, ?, ?)").bind(this.id, this.name, this.population).run()
  }

  static async creating(env, body, user, state) {
    let text
    let answer

    try {
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
        // TODO: Проверяем количество носителей языка.
        // Создаём язык.
        const language = new Language(state)
        await language.save(env)
        // Пишем радостное сообщение о том, какой язык мы создали.
        text = "Ура! Был создан язык: " + language.name
        answer = prepareTelegramAnswer(body, text)
        // Сбрасываем стэйт.
        await state.reset(env, user)
        // Отправляем сообщение.
        return getResponse(answer)
      default:
        throw new Error("tooManyStepsInStateInLanguageCreating")
      }
    } catch(error) {
      await state.reset(env, user)
      return getExceptionResponse(body, error)
    }
  }
}

class Country {
  constructor(state) {
    this.id = crypto.randomUUID()
    this.name = state.current[1]
    this.emoji = state.current[2]
    this.population = parseInt(state.current[3])
    // TODO: нужно думать.
    //this.marker = state.current[4]
    //this.languages = state.current[5]
  }

  async save(env) {
    await env.db.prepare("INSERT INTO Country (id, name, emoji, population) VALUES (?, ?, ?, ?)").bind(this.id, this.name, this.emoji, this.population).run()
    // TODO: тут нужно предусмотреть также создание объектов в таблице `CountryAndLanguage`.
    //await env.db.prepare("INSERT INTO Country (id, name, emoji, population, marker) VALUES (?, ?, ?, ?, ?)").bind(this.id, this.name, this.emoji, this.population, this.marker).run()
    // ???
  }

  static async creating(env, body, user, state) {
    let text
    let answer

    try {
      // Понять на каком этапе создания мы находимся.
      switch (state.current.length) {
      case 1:
        // Пишем просьбу о названии страны.
        text = "Напишите пожалуйста название создаваемой страны."
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 2:
        // Проверяем название страны.
        // Пишем просьбу об эмодзи страны.
        text = "Напишите пожалуйста эмодзи создаваемой страны."
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 3:
        // TODO: Проверяем эмодзи.
        // Пишем просьбу о количестве жителей страны.
        text = "Напишите пожалуйста количество жителей создаваемой страны."
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 4:
        // TODO: Проверяем количество жителей страны.
        // Запрашиваем файл с маркером.
        text = "Отправьте файл с изображением маркера страны. Он будет использоваться на карте."
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 5:
        // TODO: Работаем с маркером.
        //const fileName = "markers/" + body.message.document.file_name
        const fileName = body.message.document.file_name
        const filePathUrl = "https://api.telegram.org/bot" + env.BOT_TOKEN + "/getFile?file_id=" + body.message.document.file_id
        const filePathResponse = await fetch(filePathUrl)
        const data = await filePathResponse.json()
        const downloadURL = "https://api.telegram.org/file/bot" + env.BOT_TOKEN + "/" + data.result.file_path
        const markerResponse = await fetch(downloadURL)

        // TODO: Здесь возникает ошибка, потому что передаю неверный тип данных для запроса на сохранения объекта в БД: `TypeError: Failed to execute 'put' on 'R2Bucket': parameter 2 is not of type 'ReadableStream or ArrayBuffer or ArrayBufferView or string or Blob'.` Может быть тут ответ: https://blog.logrocket.com/programmatically-downloading-files-browser/
        await Bucket.uploadFile(env, fileName, markerResponse.blob())

        text = prepareAnswerText(body, state)
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 6:
        // Создаём страну.
        const country = new Country(state)
        await country.save(env)
        // Пишем радостное сообщение о том, какой язык мы создали.
        text = "Ура! Была создана страна: " + country.name
        answer = prepareTelegramAnswer(body, text)
        // Сбрасываем стэйт.
        await state.reset(env, user)
        // Отправляем сообщение.
        return getResponse(answer)
      default:
        throw new Error("tooManyStepsInStateInCountryCreating")
      }
    } catch(error) {
      await state.reset(env, user)
      return getExceptionResponse(body, error)
    }
  }
}

class User {
  constructor(body) {
    const username = body.message.from.username

    if (User.#auth(username)) {
      this.username = username
    } else {
      throw new Error("userIsNotAdmin")
    }
  }

  static #auth(username) {
    // Определяем список юзернэймов, у кого будет доступ к боту.
    const admins = ["borisovodov"]

    return admins.includes(username)
  }
}

class State {
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

function prepareAnswerText(body, state, allNewspapers, files, data) {
  return {
    "username": body.message.from.username,
    "text": body.message.text,
    //"results": allNewspapers,
    //"files": files.objects,
    "state": state.current,
    "data": data,
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

function getExceptionResponse(body, error) {
  // Готовим текст, чтобы сообщить об ошибке.
  const text = "Чёт какая-то трабла возникла: " + error

  // Формируем содержимое ответа на запрос для Телеграма.
  const answer = prepareTelegramAnswer(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}

function getAuthFailureResponse(body, error) {
  // Готовим текст, чтобы послать нахер.
  const text = "Не удалось аутентифицировать пользователя: " + error

  // Формируем содержимое ответа на запрос для Телеграма.
  const answer = prepareTelegramAnswer(body, text)

  // Формируем и возвращаем ответ на запрос.
  return getResponse(answer)
}
