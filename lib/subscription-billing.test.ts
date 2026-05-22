import { describe, expect, it } from "vitest";

import { getCalculatedNextPaymentAt } from "@/lib/subscription-billing";

describe("subscription billing", () => {
	it("30日ごとの支払い日を基準日から計算する", () => {
		expect(
			toDateKey(
				getCalculatedNextPaymentAt(
					{
						billingIntervalUnit: "day",
						billingIntervalCount: 30,
						nextPaymentAt: new Date(2026, 0, 1),
					},
					new Date(2026, 1, 10),
				),
			),
		).toBe("2026-03-02");
	});

	it("毎月同じ日の支払い日を基準日から計算する", () => {
		expect(
			toDateKey(
				getCalculatedNextPaymentAt(
					{
						billingIntervalUnit: "month",
						billingIntervalCount: 1,
						nextPaymentAt: new Date(2026, 0, 15),
					},
					new Date(2026, 1, 10),
				),
			),
		).toBe("2026-02-15");
	});

	it("月末にない日付はその月の最終日に丸める", () => {
		const schedule = {
			billingIntervalUnit: "month" as const,
			billingIntervalCount: 1,
			nextPaymentAt: new Date(2026, 0, 31),
		};

		expect(
			toDateKey(getCalculatedNextPaymentAt(schedule, new Date(2026, 1, 10))),
		).toBe("2026-02-28");
		expect(
			toDateKey(getCalculatedNextPaymentAt(schedule, new Date(2026, 2, 1))),
		).toBe("2026-03-31");
	});

	it("うるう日の年次支払い日は通常年で2月末に丸める", () => {
		const schedule = {
			billingIntervalUnit: "year" as const,
			billingIntervalCount: 1,
			nextPaymentAt: new Date(2024, 1, 29),
		};

		expect(
			toDateKey(getCalculatedNextPaymentAt(schedule, new Date(2025, 0, 1))),
		).toBe("2025-02-28");
		expect(
			toDateKey(getCalculatedNextPaymentAt(schedule, new Date(2028, 0, 1))),
		).toBe("2028-02-29");
	});
});

function toDateKey(date: Date | null) {
	if (!date) {
		return null;
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
