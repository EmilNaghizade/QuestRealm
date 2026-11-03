import { Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User } from "../auth/user.model.js";
import { FocusSession } from "./focus-session.model.js";
import { getFocusTimer } from "./focus.service.js";

const PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type DailyTotals = {
  _id: string;
  durationMs: number;
  sessions: number;
};

function getLocalDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  function getPart(type: string): string {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error("Unable to calculate the local date.");
    }

    return value;
  }

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function getLastSevenDates(today: string): string[] {
  // UTC is used only to step through calendar date labels.
  // Session grouping uses the account's actual time zone.
  const calendarDate = new Date(`${today}T12:00:00.000Z`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(calendarDate);
    date.setUTCDate(date.getUTCDate() - 6 + index);

    return date.toISOString().slice(0, 10);
  });
}

async function prepareUser(userId: Types.ObjectId) {
  // Record any focus that has ended before reading statistics.
  await getFocusTimer(userId);

  const user = await User.findById(userId).select("timeZone").lean();

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  return user;
}

export async function getFocusStatistics(userId: Types.ObjectId) {
  const user = await prepareUser(userId);
  const now = new Date();

  const today = getLocalDateKey(now, user.timeZone);
  const dates = getLastSevenDates(today);
  const firstDate = dates[0]!;

  // A broad UTC bound keeps the query limited while allowing
  // local-day boundaries and daylight-saving differences.
  const lowerBound = new Date(
    Date.parse(`${firstDate}T00:00:00.000Z`) - 2 * DAY_MS,
  );

  const totals = await FocusSession.aggregate<DailyTotals>([
    {
      $match: {
        userId,
        completedAt: {
          $gte: lowerBound,
          $lte: now,
        },
      },
    },
    {
      $set: {
        localDate: {
          $dateToString: {
            date: "$completedAt",
            format: "%Y-%m-%d",
            timezone: user.timeZone,
          },
        },
      },
    },
    {
      $match: {
        localDate: {
          $gte: firstDate,
          $lte: today,
        },
      },
    },
    {
      $group: {
        _id: "$localDate",
        durationMs: { $sum: "$durationMs" },
        sessions: { $sum: 1 },
      },
    },
  ]);

  const totalsByDate = new Map(totals.map((item) => [item._id, item]));

  const days = dates.map((date) => {
    const total = totalsByDate.get(date);

    return {
      date,
      minutes: (total?.durationMs ?? 0) / MINUTE_MS,
      sessions: total?.sessions ?? 0,
    };
  });

  const todaySummary = days[days.length - 1]!;

  return {
    data: {
      timeZone: user.timeZone,

      today: todaySummary,

      week: {
        minutes: days.reduce((sum, day) => sum + day.minutes, 0),
        sessions: days.reduce((sum, day) => sum + day.sessions, 0),
      },

      days,
    },
  };
}

export async function listFocusHistory(
  userId: Types.ObjectId,
  cursor?: string,
) {
  const user = await prepareUser(userId);

  let cursorFilter: {
    $or?: (
      | { completedAt: { $lt: Date } }
      | {
          completedAt: Date;
          _id: { $lt: Types.ObjectId };
        }
    )[];
  } = {};

  if (cursor) {
    const cursorSession = await FocusSession.findOne({
      _id: new Types.ObjectId(cursor),
      userId,
    })
      .select("_id completedAt")
      .lean();

    if (!cursorSession) {
      throw new AppError(
        400,
        "INVALID_HISTORY_CURSOR",
        "Refresh your focus history and try again.",
      );
    }

    cursorFilter = {
      $or: [
        {
          completedAt: {
            $lt: cursorSession.completedAt,
          },
        },
        {
          completedAt: cursorSession.completedAt,
          _id: {
            $lt: cursorSession._id,
          },
        },
      ],
    };
  }

  const sessions = await FocusSession.find({
    userId,
    ...cursorFilter,
  })
    .sort({
      completedAt: -1,
      _id: -1,
    })
    .limit(PAGE_SIZE + 1)
    .lean();

  const hasMore = sessions.length > PAGE_SIZE;
  const page = sessions.slice(0, PAGE_SIZE);
  const lastSession = page[page.length - 1];

  return {
    data: {
      timeZone: user.timeZone,

      sessions: page.map((session) => ({
        id: session._id.toString(),
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt.toISOString(),
        durationMinutes: session.durationMs / MINUTE_MS,
      })),
    },

    meta: {
      nextCursor: hasMore && lastSession ? lastSession._id.toString() : null,
    },
  };
}
