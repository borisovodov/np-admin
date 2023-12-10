// Это работа с модулями, без которой не работает D1 и вебхуки работают через листнеры — то бишь через жопу.
export default {
  // Это точка входа. Мы получаем запрос, который будем в дальнейшем обрабатывать, переменные окружения и контекст выполнения кода.
  async fetch(request, env, context) {
    // Преобразуем полученный запрос в JSON-объект.
    let body = JSON.parse(JSON.stringify(await request.json()));

    // Черновиково получаем данные из БД.
    const { results } = await env.NP_DATABASE.prepare('SELECT * FROM newspaper').all()

    // Сами формируем что показать в ответном сообщении в Телеграме.
    let text = {
      "username": body.message.from.username,
      "text": body.message.text,
      "results": results,
    };

    // Формируем содержимое ответа на запрос для Телеграма.
    let answer = {
       "method":"sendMessage",
       "chat_id": body.message.chat.id,
       "reply_to_message_id": body.message.message_id,
       "text": JSON.stringify(text),
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
