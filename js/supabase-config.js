// Everyday Black Friday — Supabase connection (PUBLIC values; safe in the browser)
//
// The "publishable" key below is DESIGNED to be public — every Supabase-powered
// website ships it in its front-end code. It is safe because the database has
// Row Level Security turned on (everyone can read deals, only the admin can
// write). The SECRET / service-role key is NEVER placed here or anywhere in
// this repo — it lives only in the Supabase dashboard and in server-side
// functions. That is what keeps us from being locked out or hacked.
//
// Project: Everyday Black Friday   (org: Black Daily Deals)
// Project ref: ncdmhmgkurfphdrjvhin
window.EBF_SUPABASE = {
  url: "https://ncdmhmgkurfphdrjvhin.supabase.co",
  publishableKey: "sb_publishable_JlZwPcWeKy6vgN8LH8jSFw_zXZUx_2j"
};
