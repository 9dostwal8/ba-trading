-- 1. Table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title_ar text NOT NULL DEFAULT '',
  title_ku text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  body_ku text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  order_id uuid,
  vendor_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own_read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_admin_read" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE is_read = false;

CREATE TRIGGER notifications_touch BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _kind text,
  _title_ar text, _title_ku text, _title_en text,
  _body_ar text DEFAULT '', _body_ku text DEFAULT '', _body_en text DEFAULT '',
  _link text DEFAULT '', _order_id uuid DEFAULT NULL, _vendor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id)
  VALUES (_user_id, _kind, _title_ar, _title_ku, _title_en, coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''), coalesce(_link,''), _order_id, _vendor_id);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admins(
  _kind text, _title_ar text, _title_ku text, _title_en text,
  _body_ar text DEFAULT '', _body_ku text DEFAULT '', _body_en text DEFAULT '',
  _link text DEFAULT '', _order_id uuid DEFAULT NULL, _vendor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id)
  SELECT ur.user_id, _kind, _title_ar, _title_ku, _title_en, coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''), coalesce(_link,''), _order_id, _vendor_id
  FROM public.user_roles ur WHERE ur.role = 'admin';
END; $$;

CREATE OR REPLACE FUNCTION public.notify_vendor(
  _vendor_id uuid, _kind text, _title_ar text, _title_ku text, _title_en text,
  _body_ar text DEFAULT '', _body_ku text DEFAULT '', _body_en text DEFAULT '',
  _link text DEFAULT '', _order_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _vendor_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id)
  SELECT vm.user_id, _kind, _title_ar, _title_ku, _title_en, coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''), coalesce(_link,''), _order_id, _vendor_id
  FROM public.vendor_members vm WHERE vm.vendor_id = _vendor_id;
END; $$;

CREATE OR REPLACE FUNCTION public.notifications_mark_read(_ids uuid[] DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false
    AND (_ids IS NULL OR id = ANY(_ids));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,text,text,text,text,text,uuid,uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins(text,text,text,text,text,text,text,text,uuid,uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_vendor(uuid,text,text,text,text,text,text,text,text,uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notifications_mark_read(uuid[]) TO authenticated;

-- 3. Order notifications
CREATE OR REPLACE FUNCTION public.notify_on_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_user(NEW.user_id, 'order_placed',
    'تم استلام طلبك #' || NEW.order_no,
    'داواکاریت وەرگیرا #' || NEW.order_no,
    'Order #' || NEW.order_no || ' received',
    'سنبلغك عند تأكيد الطلب.', 'کاتی پەسەندکردن ئاگادارت دەکەینەوە.', 'We will notify you once it is confirmed.',
    '/orders/' || NEW.id::text, NEW.id, NULL);
  PERFORM public.notify_admins('order_new',
    'طلب جديد #' || NEW.order_no,
    'داواکاری نوێ #' || NEW.order_no,
    'New order #' || NEW.order_no,
    NEW.customer_name || ' — ' || NEW.city, NEW.customer_name || ' — ' || NEW.city, NEW.customer_name || ' — ' || NEW.city,
    '/admin', NEW.id, NULL);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_order_insert AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_insert();

CREATE OR REPLACE FUNCTION public.notify_on_order_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(NEW.user_id, 'order_confirmed',
        'تم تأكيد طلبك #' || NEW.order_no, 'داواکاریت پەسەند کرا #' || NEW.order_no, 'Order #' || NEW.order_no || ' confirmed',
        'جارٍ التحضير للتوصيل.', 'ئامادە دەکرێت بۆ گەیاندن.', 'It is being prepared for delivery.',
        '/orders/' || NEW.id::text, NEW.id, NULL);
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(NEW.user_id, 'order_cancelled',
        'تم إلغاء طلبك #' || NEW.order_no, 'داواکاریت هەڵوەشێنرا #' || NEW.order_no, 'Order #' || NEW.order_no || ' cancelled',
        '', '', '', '/orders/' || NEW.id::text, NEW.id, NULL);
    END IF;
    FOR v IN SELECT DISTINCT vendor_id FROM public.order_items WHERE order_id = NEW.id AND vendor_id IS NOT NULL LOOP
      PERFORM public.notify_vendor(v.vendor_id, 'order_status',
        'تحديث حالة الطلب #' || NEW.order_no, 'نوێکردنەوەی داواکاری #' || NEW.order_no, 'Order #' || NEW.order_no || ' updated',
        'الحالة: ' || NEW.status, 'دۆخ: ' || NEW.status, 'Status: ' || NEW.status,
        '/brand', NEW.id);
    END LOOP;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status = 'paid' THEN
    PERFORM public.notify_user(NEW.user_id, 'order_paid',
      'تم تأكيد الدفع #' || NEW.order_no, 'پارەدان پەسەند کرا #' || NEW.order_no, 'Payment received #' || NEW.order_no,
      '', '', '', '/orders/' || NEW.id::text, NEW.id, NULL);
    FOR v IN SELECT DISTINCT vendor_id FROM public.order_items WHERE order_id = NEW.id AND vendor_id IS NOT NULL LOOP
      PERFORM public.notify_vendor(v.vendor_id, 'order_paid',
        'طلب مدفوع #' || NEW.order_no, 'داواکاری پارەدراو #' || NEW.order_no, 'Paid order #' || NEW.order_no,
        '', '', '', '/brand', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_order_update AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_update();

CREATE OR REPLACE FUNCTION public.notify_on_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  SELECT order_no, city INTO o FROM public.orders WHERE id = NEW.order_id;
  PERFORM public.notify_vendor(NEW.vendor_id, 'order_item_new',
    'منتج مطلوب في الطلب #' || coalesce(o.order_no::text,''),
    'بەرهەمێکت داواکراوە #' || coalesce(o.order_no::text,''),
    'Your product was ordered #' || coalesce(o.order_no::text,''),
    NEW.name_ar || ' × ' || NEW.quantity, NEW.name_ku || ' × ' || NEW.quantity, NEW.name_ar || ' × ' || NEW.quantity,
    '/brand', NEW.order_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_order_item_insert AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item();

-- 4. Reward point notifications
CREATE OR REPLACE FUNCTION public.notify_on_wallet_tx()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts text := trim(to_char(abs(NEW.amount), 'FM999999999'));
BEGIN
  IF NEW.amount > 0 THEN
    PERFORM public.notify_user(NEW.user_id, 'reward_earned',
      'حصلت على ' || pts || ' نقطة مكافأة', pts || ' خاڵی خەڵات بەدەستت هێنا', 'You earned ' || pts || ' reward points',
      coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''),
      '/profile/wallet', NULL, NULL);
  ELSIF NEW.amount < 0 THEN
    PERFORM public.notify_user(NEW.user_id, 'reward_spent',
      'تم استخدام ' || pts || ' نقطة مكافأة', pts || ' خاڵی خەڵات بەکارهێنرا', 'You redeemed ' || pts || ' reward points',
      coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''),
      '/profile/wallet', NULL, NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_wallet_tx AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_wallet_tx();

CREATE OR REPLACE FUNCTION public.notify_on_vendor_reward_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts text := trim(to_char(NEW.points, 'FM999999999'));
BEGIN
  PERFORM public.notify_vendor(NEW.vendor_id, 'vendor_reward_sponsored',
    'رعيت ' || pts || ' نقطة مكافأة', pts || ' خاڵی خەڵات پاڵپشتی کرا', 'You sponsored ' || pts || ' reward points',
    coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''),
    '/brand', NEW.order_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_vendor_reward_points AFTER INSERT ON public.vendor_reward_points
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_reward_points();

-- 5. Vendor charges
CREATE OR REPLACE FUNCTION public.notify_on_vendor_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_vendor(NEW.vendor_id, 'vendor_charge',
    'رسوم جديدة: ' || NEW.label, 'کرێی نوێ: ' || NEW.label, 'New charge: ' || NEW.label,
    trim(to_char(NEW.amount, 'FM999999999')) || ' IQD', trim(to_char(NEW.amount, 'FM999999999')) || ' IQD', trim(to_char(NEW.amount, 'FM999999999')) || ' IQD',
    '/brand', NULL);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_vendor_charge AFTER INSERT ON public.vendor_charges
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_charge();

-- 6. Vendor applications
CREATE OR REPLACE FUNCTION public.notify_on_vendor_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('vendor_application_new',
      'طلب بائع جديد: ' || NEW.store_name, 'داواکاری فرۆشیاری نوێ: ' || NEW.store_name, 'New vendor request: ' || NEW.store_name,
      NEW.city, NEW.city, NEW.city, '/admin', NULL, NEW.vendor_id);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.notify_user(NEW.user_id, 'vendor_approved',
        'تمت الموافقة على متجرك', 'فرۆشگاکەت پەسەند کرا', 'Your store was approved',
        'يمكنك الدخول وإدارة منتجاتك الآن.', 'ئێستا دەتوانی بچیتە ژوورەوە و بەرهەمەکانت بەڕێوە ببەی.', 'You can sign in and manage your products now.',
        '/brand', NULL, NEW.vendor_id);
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.user_id, 'vendor_rejected',
        'تم رفض طلب المتجر', 'داواکاری فرۆشگا ڕەت کرایەوە', 'Store request rejected',
        coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''), '/', NULL, NEW.vendor_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_vendor_application_insert AFTER INSERT ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_application();
CREATE TRIGGER notify_vendor_application_update AFTER UPDATE ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_application();

-- 7. Reviews
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT vendor_id, name_ar, name_ku INTO p FROM public.products WHERE id = NEW.product_id;
  IF p.vendor_id IS NOT NULL THEN
    PERFORM public.notify_vendor(p.vendor_id, 'product_review',
      'تقييم جديد (' || NEW.rating || '★)', 'هەڵسەنگاندنی نوێ (' || NEW.rating || '★)', 'New review (' || NEW.rating || '★)',
      p.name_ar, p.name_ku, p.name_ar, '/product/' || NEW.product_id::text, NULL);
  END IF;
  PERFORM public.notify_admins('product_review',
    'تقييم جديد (' || NEW.rating || '★)', 'هەڵسەنگاندنی نوێ (' || NEW.rating || '★)', 'New review (' || NEW.rating || '★)',
    coalesce(p.name_ar,''), coalesce(p.name_ku,''), coalesce(p.name_ar,''), '/admin', NULL, p.vendor_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_review_insert AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_review();
