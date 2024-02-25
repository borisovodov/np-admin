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
      await state.addRow(env, user, body.message.text)
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
      return await City.creating(env, body, user, state)
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

class Newspaper {
  static async all(env) {
    return await env.db.prepare('SELECT * FROM Newspaper').all()
  }
}

class Language {
  constructor(stateOrName) {
    this.id = crypto.randomUUID()

    if (Array.isArray(stateOrName.current)) {
      this.name = stateOrName.current[1]
      this.population = parseInt(stateOrName.current[2])
    } else {
      this.name = stateOrName
      this.population = null
    }
  }

  static async getOrCreate(env, name) {
    // Выясняем есть ли этот язык уже.
    const languages = await Language.findByName(env, name)

    // Проверяем список на пустоту.
    if (languages.results.length == 0) {
      const language = new Language(name)
      await language.save(env)
      return language.id
    } else {
      return languages.results[0].id
    }
  }

  static async findByName(env, name) {
    // Получаем список языков.
    return await env.db.prepare("SELECT id FROM Language WHERE name = ?").bind(name).all()
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
    this.marker = state.current[5]
  }

  async save(env, state) {
    await env.db.prepare("INSERT INTO Country (id, name, emoji, population, marker) VALUES (?, ?, ?, ?, ?)").bind(this.id, this.name, this.emoji, this.population, this.marker).run()

    // Нужно пробежаться по 6-у стэйту, через запятую пробежаться по всем языкам и для каждого языка или его получить или создать и получить.
    for (const languageString of state.current[6].split(",")) {
      // Получаем или создаём язык.
      const languageID = await Language.getOrCreate(env, languageString.trim())
      await env.db.prepare("INSERT INTO CountryAndLanguage (id, country, language) VALUES (?, ?, ?)").bind(crypto.randomUUID(), this.id, languageID).run()
    }
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
        // Работаем с маркером.
        let marker
        // С этим названием будем сохранять файл в файлохранилище. `markers/` нужен для того, чтобы файлики сохранялись в папке.
        const fileName = "markers/" + body.message.document.file_name
        // Получаем URL на скачивание файла.
        const filePathUrl = "https://api.telegram.org/bot" + env.BOT_TOKEN + "/getFile?file_id=" + body.message.document.file_id
        const filePathResponse = await fetch(filePathUrl)
        const data = await filePathResponse.json()
        // Делаем запрос на скачивание файла.
        const downloadURL = "https://api.telegram.org/file/bot" + env.BOT_TOKEN + "/" + data.result.file_path
        await fetch(downloadURL).then(response => response.blob()).then(blob => {
          // Тут сохраняем блоб с самим файлом.
          marker = blob
        })

        // Блоб сохраняем в файловое хранилище.
        // https://blog.logrocket.com/programmatically-downloading-files-browser/
        await Bucket.uploadFile(env, fileName, marker)

        // Сохранить в стэйт ключ файла.
        await state.addRow(env, user, fileName)

        text = "Напишите официальные языки этой страны через запятую."
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 6:
        // Шестого шага нет, потому что мы на этом шаге автоматизированно добавляем ключ файлика с маркером на файловом хранилище.
        throw new Error("thereIsNo6sStep")
      case 7:
        // Создаём страну.
        const country = new Country(state)
        await country.save(env, state)

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

class City {
  constructor(state) {
    this.id = crypto.randomUUID()
    this.name = state.current[1]
    this.country = state.current[2]
    this.population = parseInt(state.current[3])
    this.continent = state.current[4]
    this.coastal = state.current[5]
    this.elevation = parseInt(state.current[6])
    this.coordinates = state.current[7]
  }

  async save(env, state) {
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
        // Работаем с маркером.
        let marker
        // С этим названием будем сохранять файл в файлохранилище. `markers/` нужен для того, чтобы файлики сохранялись в папке.
        const fileName = "markers/" + body.message.document.file_name
        // Получаем URL на скачивание файла.
        const filePathUrl = "https://api.telegram.org/bot" + env.BOT_TOKEN + "/getFile?file_id=" + body.message.document.file_id
        const filePathResponse = await fetch(filePathUrl)
        const data = await filePathResponse.json()
        // Делаем запрос на скачивание файла.
        const downloadURL = "https://api.telegram.org/file/bot" + env.BOT_TOKEN + "/" + data.result.file_path
        await fetch(downloadURL).then(response => response.blob()).then(blob => {
          // Тут сохраняем блоб с самим файлом.
          marker = blob
        })

        // Блоб сохраняем в файловое хранилище.
        // https://blog.logrocket.com/programmatically-downloading-files-browser/
        await Bucket.uploadFile(env, fileName, marker)

        // Сохранить в стэйт ключ файла.
        await state.addRow(env, user, fileName)

        text = "Напишите официальные языки этой страны через запятую."
        answer = prepareTelegramAnswer(body, text)
        return getResponse(answer)
      case 6:
        // Шестого шага нет, потому что мы на этом шаге автоматизированно добавляем ключ файлика с маркером на файловом хранилище.
        throw new Error("thereIsNo6sStep")
      case 7:
        // Создаём страну.
        const country = new Country(state)
        await country.save(env, state)

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

  async addRow(env, user, row) {
    const checkedState = await State.#checkUserState(env, user)

    // Если текущего стэйта нет (то есть не возвращается ни одного объекта), то создаём новую строку и наполняем её новым сообщением.
    if (!checkedState) {
      this.current = await State.#createUserState(env, user, row)
    } else {
      // Если стэйт есть, то возвращаем текущий стэйт + новое сообщение.
      const newState = checkedState + "\t" + row
      await env.db.prepare("UPDATE User SET state = ? WHERE username = ?").bind(newState, user.username).run()
      this.current = newState.split("\t")
    }
  }

  static async #checkUserState(env, user) {
    // Получаем текущий стэйт, чтобы проверить, что он вообще есть.
    const currentState = await env.db.prepare("SELECT state FROM User WHERE username = ?").bind(user.username).all()

    if (currentState.results.length == 0) {
      return false
    }

    return currentState.results[0].state
  }

  static async #createUserState(env, user, row) {
    await env.db.prepare("INSERT INTO User (username, state) VALUES (?, ?)").bind(user.username, row).run()
    return [row]
  }

  async reset(env, user) {
    // Удаляем из БД.
    await env.db.prepare("DELETE FROM User WHERE username = ?").bind(user.username).run()

    // Очистить свойство.
    this.current = []
  }
}

class Bucket {
  static async file(env, key) {
    return await env.bucket.get(key)
  }

  static async files(env) {
    return await env.bucket.list()
  }

  static async uploadFile(env, key, file) {
    await env.bucket.put(key, file)
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
