import Link from 'next/link'

export default function HomePage() {
  const feedUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/calendar.ics`
    : 'http://localhost:3000/calendar.ics'
  
  const feedUrlWithSecret = process.env.FEED_SECRET 
    ? `${feedUrl}?key=${process.env.FEED_SECRET}`
    : feedUrl

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">School Events</span>
            <span className="block text-indigo-600">Calendar Feed</span>
          </h1>
          
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Stay up-to-date with all school events automatically. Subscribe to our calendar feed to get events directly in your calendar app.
          </p>
        </div>

        <div className="mt-16">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                📅 Subscribe to Calendar
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Calendar Feed URL:</h4>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-md text-sm font-mono break-all">
                      {feedUrlWithSecret}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(feedUrlWithSecret)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">How to Subscribe:</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">📱 iPhone/iPad (iOS)</h5>
                      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Open Settings → Calendar → Accounts</li>
                        <li>Tap "Add Account" → "Other"</li>
                        <li>Tap "Add Subscribed Calendar"</li>
                        <li>Paste the URL above</li>
                        <li>Tap "Next" and "Save"</li>
                      </ol>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🖥️ Google Calendar</h5>
                      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Open Google Calendar</li>
                        <li>Click "+" next to "Other calendars"</li>
                        <li>Select "From URL"</li>
                        <li>Paste the URL above</li>
                        <li>Click "Add calendar"</li>
                      </ol>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🍎 macOS Calendar</h5>
                      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Open Calendar app</li>
                        <li>File → New Calendar Subscription</li>
                        <li>Paste the URL above</li>
                        <li>Click "Subscribe"</li>
                        <li>Choose refresh frequency</li>
                      </ol>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">📧 Outlook</h5>
                      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Open Outlook Calendar</li>
                        <li>Home → Add Calendar → From Internet</li>
                        <li>Paste the URL above</li>
                        <li>Click "OK"</li>
                        <li>Name your calendar</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">✨ Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Automatic updates when new newsletters arrive</li>
                    <li>• All-day events and timed events supported</li>
                    <li>• Event descriptions include important details</li>
                    <li>• Works with all major calendar applications</li>
                    <li>• Free and always up-to-date</li>
                  </ul>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">Direct Download</h4>
                      <p className="text-sm text-gray-600">Download the current calendar file</p>
                    </div>
                    <Link
                      href="/calendar.ics"
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      download="school-events.ics"
                    >
                      Download .ics
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Powered by TK Newsletter • Automated event extraction from school newsletters
          </p>
        </div>
      </div>
    </div>
  )
}
