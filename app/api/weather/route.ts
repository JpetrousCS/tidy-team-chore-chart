import { NextRequest, NextResponse } from "next/server";

const weatherText: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear sky", emoji: "☀️" }, 1: { label: "Mostly clear", emoji: "🌤️" }, 2: { label: "Partly cloudy", emoji: "⛅" }, 3: { label: "Cloudy", emoji: "☁️" },
  45: { label: "Foggy", emoji: "🌫️" }, 48: { label: "Frosty fog", emoji: "🌫️" }, 51: { label: "Light drizzle", emoji: "🌦️" }, 53: { label: "Drizzle", emoji: "🌦️" }, 55: { label: "Heavy drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌦️" }, 63: { label: "Rain", emoji: "🌧️" }, 65: { label: "Heavy rain", emoji: "🌧️" }, 71: { label: "Light snow", emoji: "🌨️" }, 73: { label: "Snow", emoji: "❄️" }, 75: { label: "Heavy snow", emoji: "❄️" },
  80: { label: "Rain showers", emoji: "🌦️" }, 81: { label: "Rain showers", emoji: "🌧️" }, 82: { label: "Heavy showers", emoji: "⛈️" }, 85: { label: "Snow showers", emoji: "🌨️" }, 86: { label: "Heavy snow showers", emoji: "❄️" },
  95: { label: "Thunderstorms", emoji: "⛈️" }, 96: { label: "Storms with hail", emoji: "⛈️" }, 99: { label: "Strong storms with hail", emoji: "⛈️" },
};

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip")?.replace(/\D/g, "").slice(0, 5) || "48064";
  try {
    const placeResponse = await fetch(`https://api.zippopotam.us/us/${zip}`, { next: { revalidate: 86400 } });
    if (!placeResponse.ok) return NextResponse.json({ error: "That ZIP code could not be found." }, { status: 404 });
    const placeData = await placeResponse.json();
    const place = placeData.places?.[0];
    const latitude = Number(place?.latitude); const longitude = Number(place?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Missing coordinates");
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=3`, { next: { revalidate: 900 } });
    if (!weatherResponse.ok) throw new Error("Weather unavailable");
    const weather = await weatherResponse.json(); const current = weather.current; const daily = weather.daily;
    const condition = weatherText[current.weather_code] ?? { label: "Changing weather", emoji: "🌤️" };
    return NextResponse.json({ zip, place: `${place["place name"]}, ${place["state abbreviation"]}`, updatedAt: current.time, temperature: Math.round(current.temperature_2m), feelsLike: Math.round(current.apparent_temperature), wind: Math.round(current.wind_speed_10m), precipitation: current.precipitation, ...condition, forecast: daily.time.map((date: string, index: number) => ({ date, high: Math.round(daily.temperature_2m_max[index]), low: Math.round(daily.temperature_2m_min[index]), ...(weatherText[daily.weather_code[index]] ?? { label: "Changing", emoji: "🌤️" }) })) });
  } catch {
    return NextResponse.json({ error: "Weather is taking a break. Please try again soon." }, { status: 503 });
  }
}
