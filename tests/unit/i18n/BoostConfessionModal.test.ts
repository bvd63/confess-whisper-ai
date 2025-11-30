import { describe, expect, it } from "vitest";
import { translations } from "@/i18n/translations";

describe("Boost confirmation translations", () => {
  it("provides the English copy", () => {
    expect(translations.en.confirm.boostConfession.title).toBe("Boost confession?");
    expect(translations.en.confirm.boostConfession.message).toBe(
      "Are you sure you want to boost this confession for 24 hours for 25 coins?",
    );
  });

  it("provides the Spanish copy", () => {
    expect(translations.es.confirm.boostConfession.title).toBe("¿Impulsar confesión?");
    expect(translations.es.confirm.boostConfession.message).toBe(
      "¿Seguro que quieres impulsar esta confesión durante 24 horas por 25 monedas?",
    );
  });

  it("provides the German copy", () => {
    expect(translations.de.confirm.boostConfession.title).toBe("Beichte boosten?");
    expect(translations.de.confirm.boostConfession.message).toBe(
      "Bist du sicher, dass du diese Beichte für 24 Stunden für 25 Coins boosten möchtest?",
    );
  });
});
