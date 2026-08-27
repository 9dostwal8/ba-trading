update public.categories set image_url = m.url, icon = m.icon from (values
 ('instruments','/__l5e/assets-v1/fd0ea017-9d9c-4f1d-850b-5aa23ec73c17/cat2-instruments.png','wrench'),
 ('materials','/__l5e/assets-v1/923b3dc8-3dbd-4a12-86de-19be8326cad7/cat2-materials.png','flask'),
 ('orthodontics','/__l5e/assets-v1/66df0fba-4e41-4c4d-8885-98c8adc3e3f8/cat2-orthodontics.png','layers'),
 ('disposables','/__l5e/assets-v1/2c5abb20-0a60-4860-a491-03190dda10ed/cat2-disposables.png','package'),
 ('equipment','/__l5e/assets-v1/bc098a58-0bb7-405a-b26c-33ea5d880c0b/cat2-equipment.png','stethoscope'),
 ('restorative','/__l5e/assets-v1/c81d2093-3f61-4fad-b7e9-ec773043cb5b/cat2-restorative.png','smile'),
 ('endodontics','/__l5e/assets-v1/79df4b17-37df-4fb0-b2b0-db0e488279f5/cat2-endodontics.png','activity'),
 ('anesthesia','/__l5e/assets-v1/90f7e152-caba-40df-a1fa-31b1461141f2/cat2-anesthesia.png','syringe'),
 ('surgery','/__l5e/assets-v1/b946f507-22f3-4e39-8759-8befea90407e/cat2-surgery.png','scissors'),
 ('implants','/__l5e/assets-v1/13bf204c-d7c2-4943-b877-d6218cb44c46/cat2-implants.png','bolt'),
 ('prosthetics','/__l5e/assets-v1/6266e08d-e6ab-4770-b48c-ea1f69ac77f5/cat2-prosthetics.png','gem'),
 ('prevention','/__l5e/assets-v1/177dfd9d-0cbd-4dca-affc-5ec576938a3a/cat2-prevention.png','shield'),
 ('imaging','/__l5e/assets-v1/2a7e28a9-5318-46a9-ab07-5854a04f0d70/cat2-imaging.png','eye'),
 ('sterilization','/__l5e/assets-v1/a7e0a929-5ba4-44d8-98b2-b2e496f343a7/cat2-sterilization.png','thermometer'),
 ('handpieces','/__l5e/assets-v1/703d6a7f-a4c5-4cdc-ab3a-efcb54de0b17/cat2-handpieces.png','zap')
) as m(slug,url,icon) where categories.slug = m.slug;