import { Api, sessions, TelegramClient } from "telegram-gifts";
import { Telegraf } from "telegraf";
import delay from "delay";

import { env } from "./env.js";

import StarGift = Api.StarGift;
import StarGifts = Api.payments.StarGifts;
import GetStarGifts = Api.payments.GetStarGifts;
import GetPaymentForm = Api.payments.GetPaymentForm;
import SendStarsForm = Api.payments.SendStarsForm;

const stringSession = new sessions.StringSession(env.API_SESSION);
const client = new TelegramClient(stringSession, Number(env.API_ID), env.API_HASH, {
  connectionRetries: 5,
});

const telegraf = new Telegraf(env.BOT_TOKEN);
let telegramCode: null | string = null;

telegraf.on("message", async (message) => {
  telegramCode = (message.text as string).split("").reverse().join("");
});

telegraf.launch();

await client
  .start({
    phoneNumber: async () => env.PHONE_NUMBER,
    password: async () => env.TFA_PASSWORD as string,
    phoneCode: async () => {
      await telegraf.telegram.sendMessage(
        env.TELEGRAM_ID,
        "Вам должен придти код, отправьте его в ответном сообщении, а еще подпишитесь на @giftsatellite",
      );
      while (!telegramCode) {
        await delay(1000);
      }
      return telegramCode;
    },
    onError: (err) => {
      console.error("Telegram error:", err);
      debugger;
    },
  })
  .then(() => {
    if (!env.API_SESSION) {
      console.log(client.session.save());
    }
  });

while (true) {
  try {
    const starGifts = (await client.invoke(new GetStarGifts({ hash: 0 }))) as StarGifts;

    const gifts = starGifts.gifts as StarGift[];

    const limitedGifts = gifts.filter((gift) => {
      return gift.limited;
    });

    const sortedLimitedGifts = limitedGifts.sort(
      (a, b) => b.stars.toJSNumber() - a.stars.toJSNumber(),
    );

    const notSoldOut = sortedLimitedGifts.filter(
      (gift) => gift.className === "StarGift" && !gift.soldOut,
    );

    if (notSoldOut.length) {
      console.log("Новые подарки вышли!");
      telegraf.telegram.sendMessage(env.TELEGRAM_ID, "Новые подарки вышли! Веселье началось!");
    }

    if (!notSoldOut.length) {
      console.log("Ждём подарков...");
      await new Promise((f) => setTimeout(f, 500));
      continue;
    }

    const giftsMatchingFilters = notSoldOut.filter(
      (gift) =>
        gift.stars.toJSNumber() <= env.MAXIMUM_PRICE &&
        Number(gift.availabilityTotal) <= env.MAXIMUM_SUPPLY,
    );

    if (giftsMatchingFilters.length === 0) {
      console.log("Нет подарков по фильтрам");
      continue;
    }

    const giftsToBuy =
      env.BUY_STRATEGY === 2
        ? [giftsMatchingFilters[0]]
        : env.BUY_STRATEGY === 3
          ? [giftsMatchingFilters[giftsMatchingFilters.length - 1]]
          : giftsMatchingFilters;

    for (const gift of giftsToBuy) {
      const invoice = new Api.InputInvoiceStarGift({
        peer: new Api.InputPeerSelf(),
        giftId: gift.id,
        hideName: true,
        message: new Api.TextWithEntities({
          text: "@giftsatellite", // Текст комментария (оставьте, если хотите поддержать разработчика)
          entities: [],
        }),
      });

      const paymentForm = await client.invoke(new GetPaymentForm({ invoice }));

      if (
        paymentForm.invoice.className === "Invoice" &&
        paymentForm.invoice.prices.length === 1 &&
        paymentForm.invoice.prices[0].amount.toJSNumber() === gift.stars.toJSNumber()
      ) {
        try {
          await client.invoke(new SendStarsForm({ invoice, formId: paymentForm.formId }));
        } catch (err) {
          console.log(err);
        }
      }
    }
  } catch (error) {
    console.error(error);
    console.log("Some unhandled error, restarting in 5 secs");
    await delay(5000);
  }
}
