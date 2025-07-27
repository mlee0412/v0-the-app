# The App

This project requires several environment variables. For the weather widget, create a `.env.local` file and add your OpenWeather API key:

```bash
OPEN_WEATHER_API_KEY=your_api_key_here
```

Optional defaults for latitude and longitude can also be set:

```bash
NEXT_PUBLIC_DEFAULT_LAT=40.7128
NEXT_PUBLIC_DEFAULT_LON=-74.0060
```

The key can also be named `NEXT_PUBLIC_OPEN_WEATHER_API_KEY` if you want it available to client code.
