// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default {
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Это пример того, как полуются переменные окружения.
    //const BOT_TOKEN = "${env.BOT_TOKEN}"

    // Преобразуем полученный запрос в JSON-объект.
    let body = JSON.parse(JSON.stringify(await request.json()));

    // Формируем содержимое ответа на запрос.
    let answer = {
           "method":"sendMessage",
           "chat_id": body.message.chat.id,
           "reply_to_message_id" : body.message.message_id,
           "text" :JSON.stringify(body.message)
    };

    // Формируем ответ на запрос.
    let response = new Response(
      JSON.stringify(answer), {
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
        status: 200
      })
    
      // Возвращаем ответ на запрос.
    return response
  },
};
