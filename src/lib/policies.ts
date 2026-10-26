/**
 * Default policy text describing what this website actually does with data.
 * The company should have both reviewed by its legal adviser and replace them in Admin → Settings.
 */
export function defaultPrivacy(business: string, email?: string | null) {
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

export function defaultTerms(business: string) {
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
