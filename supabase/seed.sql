-- Everyday Black Friday — seed deals (the current 11 from data/deals.json)
-- Re-runnable: ON CONFLICT (ext_id) DO NOTHING, so running again will NOT
-- overwrite any edits made later through the admin screen. To force a refresh
-- of a specific row, edit it in the admin screen (or change DO NOTHING to a
-- DO UPDATE for that run).

insert into public.deals
  (ext_id, title, category, subcategory, image, price, original_price, discount,
   store, affiliate_url, is_affiliate, is_black_friday, price_checked, featured, deal_of_day, source)
values
 ('d001','Amazon Fire TV Stick 4K Streaming Device','electronics','Streaming','https://m.media-amazon.com/images/I/61blUHa9vvL._AC_SL400_.jpg',19.99,59.99,67,'Amazon','https://www.amazon.com/s?k=amazon+fire+tv+stick+4k+streaming+device&tag=blackdailydeals-20',true,true,'2026-11-17',true,true,'manual'),
 ('d002','INSIGNIA 55" QF Series QLED 4K UHD Smart Fire TV','electronics','TVs','https://m.media-amazon.com/images/I/815Qli0AKJL._AC_SL400_.jpg',199.99,399.99,50,'Amazon','https://www.amazon.com/s?k=insignia+55+inch+QF+series+qled+4k+fire+tv&tag=blackdailydeals-20',true,true,'2026-11-17',true,true,'manual'),
 ('d003','Ring Battery Doorbell 2K (Newest Model)','home','Smart Home','https://m.media-amazon.com/images/I/616Leg1GwuL._AC_SL400_.jpg',39.99,99.99,60,'Amazon','https://www.amazon.com/s?k=ring+battery+doorbell+2k&tag=blackdailydeals-20',true,true,'2026-11-17',true,true,'manual'),
 ('d004','Beats Solo 4 Wireless On-Ear Headphones','electronics','Audio','https://m.media-amazon.com/images/I/515FE+S4yLL._AC_SL400_.jpg',129.95,199.95,35,'Amazon','https://www.amazon.com/s?k=beats+solo+4+wireless+headphones&tag=blackdailydeals-20',true,false,'2026-11-17',true,true,'manual'),
 ('d005','Dyson V8 Cordless Stick Vacuum','home','Vacuums','https://m.media-amazon.com/images/I/51WShDQ+QIL._AC_SL400_.jpg',272.00,399.99,32,'Amazon','https://www.amazon.com/s?k=dyson+v8+cordless+vacuum&tag=blackdailydeals-20',true,false,'2026-11-17',true,false,'manual'),
 ('d006','Stanley Quencher H2.0 30 oz Tumbler','sports','Hydration','https://m.media-amazon.com/images/I/61WM1xukklL._AC_SL400_.jpg',20.00,40.00,50,'Amazon','https://www.amazon.com/s?k=stanley+quencher+30+oz+tumbler&tag=blackdailydeals-20',true,true,'2026-11-17',true,false,'manual'),
 ('d007','KitchenAid 3.5 Cup Food Chopper','home','Kitchen','https://m.media-amazon.com/images/I/71b821iOFfL._AC_SL400_.jpg',44.95,69.99,36,'Amazon','https://www.amazon.com/s?k=kitchenaid+3.5+cup+food+chopper&tag=blackdailydeals-20',true,false,'2026-11-17',true,false,'manual'),
 ('d008','JBL Quantum 100M2 Gaming Headset','electronics','Gaming','https://m.media-amazon.com/images/I/71wXaRKevmL._AC_SL400_.jpg',24.95,44.95,44,'Amazon','https://www.amazon.com/s?k=jbl+quantum+100m2+gaming+headset&tag=blackdailydeals-20',true,false,'2026-11-17',false,false,'manual'),
 ('d009','Soundcore V20i Open-Ear Earbuds by Anker','electronics','Audio','https://m.media-amazon.com/images/I/517WiAmP8qL._AC_SL400_.jpg',24.99,49.99,50,'Amazon','https://www.amazon.com/s?k=anker+soundcore+v20i+open+ear+earbuds&tag=blackdailydeals-20',true,true,'2026-11-17',false,false,'manual'),
 ('d010','UGG Tazzette Shearling Collar Slipper','fashion','Shoes','https://m.media-amazon.com/images/I/411zbZqpnrL._AC_SL400_.jpg',70.00,110.00,36,'UGG','https://www.ugg.com/search?q=tazzette',false,false,'2026-11-17',false,false,'manual'),
 ('d011','Lenovo Yoga Slim 7x 14" Snapdragon Laptop','electronics','Laptops','https://m.media-amazon.com/images/I/61tkCq9M9-L._AC_SL400_.jpg',649.00,1299.00,50,'Best Buy','https://www.bestbuy.com/site/searchpage.jsp?st=lenovo+yoga+slim+7x',false,true,'2026-11-17',false,false,'manual')
on conflict (ext_id) do nothing;
