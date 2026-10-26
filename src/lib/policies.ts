/**
 * Default policy text describing what this website actually does with data.
 * The company should have both reviewed by its legal adviser and replace them in Admin → Settings.
 */
export function defaultPrivacy(business: string, email?: string | null, locale: "en" | "ta" = "en") {
  if (locale === "ta") return privacyTa(business, email);
  return `${business} ("we") operates this website. This policy explains what personal information the website collects and how it is used.

## What we collect
When you send an enquiry, construction enquiry or site visit request, we collect the details you enter: your name, phone number, and optionally your email address and message. For construction enquiries we also store any plot, size, budget and timing details you provide. We record the time of submission, the page you sent it from, and a one-way hash of your IP address used only to prevent spam and abuse.

## How we use it
We use your details only to respond to your request — to call or message you about the property, project or service you asked about, and to arrange site visits. We do not sell your information or share it with third parties for marketing.

## Who can see it
Your request is visible only to authorised ${business} staff through a password-protected dashboard. Staff notification emails do not contain your contact details.

## How long we keep it
We keep enquiry records for as long as needed to respond and to maintain a record of our customer conversations, unless you ask us to delete them.

## Your choices
You can ask us to access, correct or delete the information we hold about you${email ? ` by emailing ${email}` : " by contacting us through this website"}.

## Cookies
This website does not use advertising or analytics cookies. Staff who sign in to the dashboard receive a strictly necessary session cookie.`;
}

export function defaultTerms(business: string, locale: "en" | "ta" = "en") {
  if (locale === "ta") return termsTa(business);
  return `These terms apply to your use of the ${business} website.

## Property information
Listings describe properties as recorded by ${business} at the time of publication. Prices, availability and specifications may change and are confirmed only in writing at the time of a transaction. Illustrations marked as samples are not photographs of real properties.

## No offer or commitment
Nothing on this website is a binding offer. Submitting an enquiry or site visit request does not create a contract or reserve a property; a site visit is booked only when our team confirms it with you.

## Your use of the website
Please submit accurate information and do not misuse the forms. We may refuse or delete submissions that appear automated or abusive.

## Content
The website's text, drawings and design belong to ${business} or are used with permission.

## Changes
We may update these terms from time to time. The current version always appears on this page.`;
}

const TA_NOTE = "இது ஆங்கிலப் பதிப்பின் தமிழ் மொழிபெயர்ப்பு. இரண்டுக்கும் இடையே வேறுபாடு இருந்தால் ஆங்கிலப் பதிப்பே செல்லுபடியாகும்.";

function privacyTa(business: string, email?: string | null) {
  return `${business} ("நாங்கள்") இந்த இணையதளத்தை இயக்குகிறோம். இணையதளம் எந்தத் தனிப்பட்ட தகவல்களைச் சேகரிக்கிறது, அவை எவ்வாறு பயன்படுத்தப்படுகின்றன என்பதை இந்தக் கொள்கை விளக்குகிறது.

## நாங்கள் சேகரிப்பவை
நீங்கள் விசாரணை, கட்டுமான விசாரணை அல்லது நேரில் பார்வைக் கோரிக்கையை அனுப்பும்போது, நீங்கள் உள்ளிடும் விவரங்களைச் சேகரிக்கிறோம்: உங்கள் பெயர், தொலைபேசி எண், விருப்பமாக மின்னஞ்சல் முகவரி மற்றும் செய்தி. கட்டுமான விசாரணைகளுக்கு நீங்கள் தரும் மனை, அளவு, பட்ஜெட், கால விவரங்களையும் சேமிக்கிறோம். சமர்ப்பித்த நேரம், அனுப்பிய பக்கம், மற்றும் ஸ்பேம், தவறான பயன்பாட்டைத் தடுக்க மட்டும் பயன்படும் உங்கள் IP முகவரியின் ஒருவழி ஹாஷ் ஆகியவற்றைப் பதிவு செய்கிறோம்.

## எவ்வாறு பயன்படுத்துகிறோம்
உங்கள் கோரிக்கைக்குப் பதிலளிக்க மட்டுமே உங்கள் விவரங்களைப் பயன்படுத்துகிறோம் — நீங்கள் கேட்ட சொத்து, திட்டம் அல்லது சேவை பற்றி அழைக்க அல்லது செய்தி அனுப்ப, நேரில் பார்வைகளை ஏற்பாடு செய்ய. உங்கள் தகவல்களை விற்பதில்லை; சந்தைப்படுத்தலுக்காக மூன்றாம் தரப்பினருடன் பகிர்வதில்லை.

## யார் பார்க்க முடியும்
கடவுச்சொல் பாதுகாப்புள்ள டாஷ்போர்டு மூலம் அங்கீகரிக்கப்பட்ட ${business} ஊழியர்கள் மட்டுமே உங்கள் கோரிக்கையைப் பார்க்க முடியும். ஊழியர்களுக்கான அறிவிப்பு மின்னஞ்சல்களில் உங்கள் தொடர்பு விவரங்கள் இருக்காது.

## எவ்வளவு காலம் வைத்திருக்கிறோம்
நீங்கள் நீக்கக் கேட்கும் வரை, பதிலளிக்கவும் வாடிக்கையாளர் உரையாடல்களின் பதிவைப் பராமரிக்கவும் தேவையான காலம் வரை விசாரணைப் பதிவுகளை வைத்திருக்கிறோம்.

## உங்கள் தேர்வுகள்
நாங்கள் வைத்திருக்கும் உங்கள் தகவல்களைப் பார்க்க, திருத்த அல்லது நீக்க${email ? ` ${email} என்ற முகவரிக்கு மின்னஞ்சல் அனுப்பிக்` : " இந்த இணையதளம் மூலம் எங்களைத் தொடர்பு கொண்டு"} கேட்கலாம்.

## குக்கீகள்
இந்த இணையதளம் விளம்பர அல்லது பகுப்பாய்வுக் குக்கீகளைப் பயன்படுத்துவதில்லை. உள்நுழையும் பயனர்களுக்கு மிக அவசியமான அமர்வுக் குக்கீ மட்டும் வழங்கப்படும்.

${TA_NOTE}`;
}

function termsTa(business: string) {
  return `இந்த விதிமுறைகள் ${business} இணையதளத்தை நீங்கள் பயன்படுத்துவதற்குப் பொருந்தும்.

## சொத்துத் தகவல்
வெளியிடும் நேரத்தில் ${business} பதிவு செய்தபடியே விளம்பரங்கள் சொத்துகளை விவரிக்கின்றன. விலை, கிடைக்கும் நிலை, விவரக்குறிப்புகள் மாறலாம்; பரிவர்த்தனையின் போது எழுத்துப்பூர்வமாக மட்டுமே உறுதி செய்யப்படும். மாதிரி எனக் குறிக்கப்பட்ட படங்கள் உண்மையான சொத்துகளின் புகைப்படங்கள் அல்ல.

## சலுகையோ கடமையோ இல்லை
இந்த இணையதளத்தில் உள்ள எதுவும் கட்டுப்படுத்தும் சலுகை அல்ல. விசாரணை அல்லது நேரில் பார்வைக் கோரிக்கையை அனுப்புவது ஒப்பந்தத்தை உருவாக்காது, சொத்தை முன்பதிவு செய்யாது; எங்கள் குழு உங்களுடன் உறுதி செய்த பிறகே நேரில் பார்வை பதிவாகும்.

## இணையதளப் பயன்பாடு
துல்லியமான தகவல்களைச் சமர்ப்பியுங்கள்; படிவங்களைத் தவறாகப் பயன்படுத்த வேண்டாம். தானியங்கியாகவோ தவறாகவோ தோன்றும் சமர்ப்பிப்புகளை நிராகரிக்கவோ நீக்கவோ செய்யலாம்.

## உள்ளடக்கம்
இணையதளத்தின் உரை, வரைபடங்கள், வடிவமைப்பு ${business} நிறுவனத்திற்குச் சொந்தமானவை அல்லது அனுமதியுடன் பயன்படுத்தப்படுபவை.

## மாற்றங்கள்
இந்த விதிமுறைகளை அவ்வப்போது புதுப்பிக்கலாம். தற்போதைய பதிப்பு எப்போதும் இந்தப் பக்கத்தில் இருக்கும்.

${TA_NOTE}`;
}
