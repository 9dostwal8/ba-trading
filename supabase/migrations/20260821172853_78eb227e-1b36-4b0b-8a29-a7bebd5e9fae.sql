update public.categories set image_url = '/__l5e/assets-v1/8996515f-6a7b-4146-ab4e-fa77d4e4b97d/cat-instruments.png' where slug='instruments';
update public.categories set image_url = '/__l5e/assets-v1/b200476f-7aac-4219-adc8-6dc5efec08cc/cat-materials.png' where slug='materials';
update public.categories set image_url = '/__l5e/assets-v1/175c46a8-caf4-4174-bdea-f1b271ff6101/cat-orthodontics.png' where slug='orthodontics';
update public.categories set image_url = '/__l5e/assets-v1/67d4ce14-c048-4842-8763-3f53a5b9e0d1/cat-disposables.png' where slug='disposables';
update public.categories set image_url = '/__l5e/assets-v1/e3d3c83f-d176-4a59-8432-ef943dc7d758/cat-equipment.png' where slug='equipment';

insert into public.categories (slug, name_ar, name_ku, icon, hue, chroma, sort_order, image_url, is_active) values
('restorative','الحشوات والترميم','پڕکردنەوە و چاککردنەوە','gem',350,0.14,6,'/__l5e/assets-v1/861908ae-efef-4b67-b19a-b2610ff0ce80/cat-restorative.png',true),
('endodontics','علاج العصب (اللبية)','چارەسەری ڕەگ','brush',45,0.15,7,'/__l5e/assets-v1/1b26b895-4dc1-4224-a0a1-f11bdaa90671/cat-endodontics.png',true),
('anesthesia','التخدير','بێهۆشکردن','shield',10,0.14,8,'/__l5e/assets-v1/d47006e6-1f9a-49db-9f74-d20fe2a971fb/cat-anesthesia.png',true),
('surgery','جراحة الفم','نەشتەرگەری دەم','wrench',25,0.16,9,'/__l5e/assets-v1/66a43dfa-9a54-4f7e-aba0-40d3ac110366/cat-surgery.png',true),
('implants','الزرعات','ئیمپلانت','microscope',220,0.13,10,'/__l5e/assets-v1/83a1fe1b-d31c-40bd-afc5-edd47a1717ce/cat-implants.png',true),
('prosthetics','التركيبات والأطقم','پرۆتێز و تاج','gem',60,0.14,11,'/__l5e/assets-v1/67510181-2628-4620-830c-4feed620e156/cat-prosthetics.png',true),
('prevention','الوقاية والعناية','پاراستن و چاودێری','shield',145,0.14,12,'/__l5e/assets-v1/4851d545-b5ac-49a7-9853-ade40eefa309/cat-prevention.png',true),
('imaging','الأشعة والتصوير','تیشک و وێنەگرتن','microscope',235,0.15,13,'/__l5e/assets-v1/4e0375c2-9204-4cac-a6f5-5507e5bd0fef/cat-imaging.png',true),
('sterilization','التعقيم','ستەریلایزکردن','shield',185,0.13,14,'/__l5e/assets-v1/d86d911a-4500-4105-a537-7db3e0baf271/cat-sterilization.png',true),
('handpieces','التوربينات والفريزات','تۆربین و فرێز','wrench',195,0.15,15,'/__l5e/assets-v1/2d696dab-f563-4056-8da6-d190c690edf8/cat-handpieces.png',true)
on conflict (slug) do update set image_url = excluded.image_url, name_ar = excluded.name_ar, name_ku = excluded.name_ku, hue = excluded.hue, chroma = excluded.chroma, sort_order = excluded.sort_order;