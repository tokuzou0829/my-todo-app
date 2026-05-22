export type BillingIntervalUnit = "day" | "week" | "month" | "year";

export type BillingSchedule = {
	billingIntervalUnit: BillingIntervalUnit;
	billingIntervalCount: number;
	nextPaymentAt: string | Date;
};

export function getCalculatedNextPaymentAt(
	schedule: BillingSchedule,
	baseDate = new Date(),
) {
	const anchorDate = new Date(schedule.nextPaymentAt);
	return calculateNextPaymentAt({
		anchorDate,
		baseDate,
		unit: schedule.billingIntervalUnit,
		count: schedule.billingIntervalCount,
	});
}

export function getPaymentsPerYear(unit: BillingIntervalUnit, count: number) {
	if (unit === "day") {
		return 365 / count;
	}

	if (unit === "week") {
		return 52 / count;
	}

	if (unit === "month") {
		return 12 / count;
	}

	return 1 / count;
}

function calculateNextPaymentAt({
	anchorDate,
	baseDate,
	unit,
	count,
}: {
	anchorDate: Date;
	baseDate: Date;
	unit: BillingIntervalUnit;
	count: number;
}) {
	if (
		Number.isNaN(anchorDate.getTime()) ||
		Number.isNaN(baseDate.getTime()) ||
		!Number.isInteger(count) ||
		count < 1
	) {
		return null;
	}

	const today = startOfLocalDay(baseDate);
	let nextPaymentAt = startOfLocalDay(anchorDate);

	while (nextPaymentAt < today) {
		if (unit === "day") {
			nextPaymentAt = addDays(nextPaymentAt, count);
		} else if (unit === "week") {
			nextPaymentAt = addDays(nextPaymentAt, count * 7);
		} else if (unit === "month") {
			nextPaymentAt = addMonthsKeepingAnchorDay(
				nextPaymentAt,
				count,
				anchorDate.getDate(),
			);
		} else {
			nextPaymentAt = addYearsKeepingAnchorDate(
				nextPaymentAt,
				count,
				anchorDate.getMonth(),
				anchorDate.getDate(),
			);
		}
	}

	return nextPaymentAt;
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function addMonthsKeepingAnchorDay(
	date: Date,
	months: number,
	anchorDay: number,
) {
	const result = new Date(date);
	result.setDate(1);
	result.setMonth(result.getMonth() + months);
	result.setDate(
		Math.min(
			anchorDay,
			getLastDayOfMonth(result.getFullYear(), result.getMonth()),
		),
	);
	return result;
}

function addYearsKeepingAnchorDate(
	date: Date,
	years: number,
	anchorMonth: number,
	anchorDay: number,
) {
	const result = new Date(date);
	result.setDate(1);
	result.setFullYear(result.getFullYear() + years, anchorMonth, 1);
	result.setDate(
		Math.min(anchorDay, getLastDayOfMonth(result.getFullYear(), anchorMonth)),
	);
	return result;
}

function getLastDayOfMonth(year: number, month: number) {
	return new Date(year, month + 1, 0).getDate();
}
